//! «Lo que deberías saber»: avisos automáticos sobre el filtro activo. Cada aviso trae un tipo y
//! sus parámetros (para que la interfaz lo componga en su idioma) y un texto en español (MCP).

use crate::insights::{classify_turn, shell_commands, turn_stats};
use crate::queries::{self, Filter};
use crate::sessions;
use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::{json, Map, Value};
use std::collections::HashMap;

/// Modelo de referencia para estimar el ahorro de los turnos sencillos.
pub const CHEAPER_MODEL: &str = "claude-sonnet-5";
const SHELL_TOOLS: &[&str] = &["Bash", "shell", "exec_command", "run_shell_command"];

#[derive(Debug, Serialize, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    /// `compactions`, `expensive_model`, `tool_errors`, `spend_spike` o `cache_drop`.
    pub kind: String,
    /// `critical`, `warn` o `info`.
    pub severity: String,
    pub params: Map<String, Value>,
    /// Texto en español, para quien no compone el suyo (servidor MCP).
    pub message: String,
}

fn finding(kind: &str, severity: &str, params: Value, message: String) -> Finding {
    Finding {
        kind: kind.into(),
        severity: severity.into(),
        params: params.as_object().cloned().unwrap_or_default(),
        message,
    }
}

fn rank(severity: &str) -> u8 {
    match severity {
        "critical" => 0,
        "warn" => 1,
        _ => 2,
    }
}

/// Precio de entrada vigente (USD/M) de un modelo, si tiene.
fn input_price(conn: &Connection, model: &str) -> Result<Option<f64>> {
    Ok(conn
        .query_row(
            "SELECT input FROM prices WHERE model = ?1 ORDER BY valid_from DESC LIMIT 1",
            params![model],
            |r| r.get(0),
        )
        .optional()?)
}

/// Todos los avisos del filtro, del más grave al menos. `now` y `tz_offset_min` como en `queries`.
pub fn compute(
    conn: &Connection,
    f: &Filter,
    now: i64,
    tz_offset_min: i64,
) -> Result<Vec<Finding>> {
    let mut out = Vec::new();
    out.extend(compactions(conn, f)?);
    out.extend(expensive_model(conn, f)?);
    out.extend(tool_errors(conn, f)?);
    out.extend(spend_spike(conn, f, tz_offset_min)?);
    out.extend(cache_drop(conn, f, now)?);
    out.sort_by_key(|x| rank(&x.severity));
    Ok(out)
}

fn compactions(conn: &Connection, f: &Filter) -> Result<Option<Finding>> {
    let list = sessions::list_sessions(conn, f, None)?;
    let mut heavy: Vec<_> = list
        .sessions
        .iter()
        .filter(|s| s.compactions >= 3)
        .collect();
    if heavy.is_empty() {
        return Ok(None);
    }
    heavy.sort_by(|a, b| {
        b.compactions
            .cmp(&a.compactions)
            .then(b.cost_usd.total_cmp(&a.cost_usd))
    });
    let top = heavy[0];
    let project = top
        .project
        .clone()
        .unwrap_or_else(|| "(sin proyecto)".into());
    let branch = top.branch.clone().unwrap_or_default();
    let place = if branch.is_empty() {
        project.clone()
    } else {
        format!("{project} · {branch}")
    };
    Ok(Some(finding(
        "compactions",
        "critical",
        json!({ "n": heavy.len(), "project": project, "branch": branch, "max": top.compactions, "sessionId": top.id }),
        format!(
            "{} sesiones con 3+ compactaciones de contexto; la peor ({} compactaciones) en {place}. Divide la tarea o delega en subagentes.",
            heavy.len(),
            top.compactions
        ),
    )))
}

fn expensive_model(conn: &Connection, f: &Filter) -> Result<Option<Finding>> {
    let Some(cheap) = input_price(conn, CHEAPER_MODEL)? else {
        return Ok(None);
    };
    let mut by_model: HashMap<String, f64> = HashMap::new();
    let mut simple_total = 0.0;
    for t in turn_stats(conn, f)?.values() {
        if !matches!(classify_turn(t), "exploration" | "conversation") {
            continue;
        }
        simple_total += t.cost_usd;
        if let Some(m) = t.dominant_model() {
            if m.contains("opus") || m.contains("fable") {
                *by_model.entry(m.to_string()).or_default() += t.cost_usd;
            }
        }
    }
    let mut cost = 0.0;
    let mut saving = 0.0;
    let mut top: Option<(String, f64)> = None;
    for (model, c) in &by_model {
        let Some(p) = input_price(conn, model)? else {
            continue;
        };
        if p <= cheap {
            continue;
        }
        cost += c;
        saving += c * (1.0 - cheap / p);
        if top.as_ref().is_none_or(|(_, tc)| c > tc) {
            top = Some((model.clone(), *c));
        }
    }
    let Some((model, _)) = top.filter(|_| saving > 1.0) else {
        return Ok(None);
    };
    let share = if simple_total > 0.0 {
        cost / simple_total
    } else {
        0.0
    };
    Ok(Some(finding(
        "expensive_model",
        "warn",
        json!({ "model": model, "cost": cost, "saving": saving, "share": share, "cheaper": CHEAPER_MODEL }),
        format!(
            "El {:.0}% del gasto en exploración y conversación (${cost:.2}) va a {model}. Con {CHEAPER_MODEL} habría costado ≈ ${saving:.2} menos.",
            share * 100.0
        ),
    )))
}

fn tool_errors(conn: &Connection, f: &Filter) -> Result<Vec<Finding>> {
    let mut failing: Vec<_> = queries::breakdown(conn, f, "tool")?
        .into_iter()
        .filter(|r| r.calls >= 20 && r.errors as f64 / r.calls as f64 > 0.10)
        .collect();
    failing.sort_by(|a, b| (b.errors * a.calls).cmp(&(a.errors * b.calls)));
    let mut commands = None;
    let mut out = Vec::new();
    for r in failing.into_iter().take(3) {
        let rate = r.errors as f64 / r.calls as f64;
        let mut p = json!({ "tool": r.key, "rate": rate, "errors": r.errors, "calls": r.calls });
        let mut message = format!(
            "{} falla un {:.0}% ({} de {} usos).",
            r.key,
            rate * 100.0,
            r.errors,
            r.calls
        );
        if SHELL_TOOLS.contains(&r.key.as_str()) {
            if commands.is_none() {
                commands = Some(shell_commands(conn, f)?);
            }
            if let Some(c) = commands
                .as_ref()
                .and_then(|c| c.iter().filter(|c| c.errors > 0).max_by_key(|c| c.errors))
            {
                p["command"] = json!(c.key);
                p["commandErrors"] = json!(c.errors);
                message.push_str(&format!(" {} concentra {} errores.", c.key, c.errors));
            }
        }
        out.push(finding("tool_errors", "warn", p, message));
    }
    Ok(out)
}

fn spend_spike(conn: &Connection, f: &Filter, tz_offset_min: i64) -> Result<Option<Finding>> {
    let days: Vec<_> = queries::timeseries(conn, f, "day", tz_offset_min)?
        .into_iter()
        .filter(|p| p.cost_usd > 0.0)
        .collect();
    if days.len() < 5 {
        return Ok(None);
    }
    let n = days.len() as f64;
    let mean = days.iter().map(|p| p.cost_usd).sum::<f64>() / n;
    let sd = (days
        .iter()
        .map(|p| (p.cost_usd - mean).powi(2))
        .sum::<f64>()
        / n)
        .sqrt();
    let max = days
        .iter()
        .max_by(|a, b| a.cost_usd.total_cmp(&b.cost_usd))
        .expect("hay días");
    if max.cost_usd <= 2.0 * mean || max.cost_usd <= mean + 2.0 * sd {
        return Ok(None);
    }
    let times = max.cost_usd / mean;
    Ok(Some(finding(
        "spend_spike",
        "info",
        json!({ "ts": max.ts, "cost": max.cost_usd, "times": times, "mean": mean }),
        format!(
            "Pico de gasto: ${:.2} en un día, {times:.1}× la media diaria (${mean:.2}).",
            max.cost_usd
        ),
    )))
}

fn cache_drop(conn: &Connection, f: &Filter, now: i64) -> Result<Option<Finding>> {
    let Some(from) = f.from else { return Ok(None) };
    let span = f.to.unwrap_or(now) - from;
    if span <= 0 {
        return Ok(None);
    }
    let prev = Filter {
        from: Some(from - span),
        to: Some(from),
        ..f.clone()
    };
    let cur = queries::summary(conn, f, now)?;
    let before = queries::summary(conn, &prev, now)?;
    if cur.calls == 0 || before.calls == 0 {
        return Ok(None);
    }
    let drop = before.cache_hit - cur.cache_hit;
    if drop <= 0.03 {
        return Ok(None);
    }
    Ok(Some(finding(
        "cache_drop",
        "warn",
        json!({ "before": before.cache_hit, "now": cur.cache_hit, "pp": drop * 100.0 }),
        format!(
            "El cache hit ha bajado {:.1} puntos frente al periodo anterior ({:.1}% → {:.1}%).",
            drop * 100.0,
            before.cache_hit * 100.0,
            cur.cache_hit * 100.0
        ),
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::queries::testdata;

    const DAY: i64 = 86_400_000;

    fn conn() -> Connection {
        let c = db::open_in_memory().unwrap();
        c.execute_batch(
            "INSERT INTO agents VALUES ('claude-code','Claude Code','/c',0);
             INSERT INTO projects (id,name,cwd,repo_root) VALUES (1,'web','/w','/w');",
        )
        .unwrap();
        c
    }

    fn session(c: &Connection, id: &str, branch: &str) {
        c.execute(
            "INSERT INTO sessions (id,agent_id,project_id,git_branch,started_at,ended_at) VALUES (?1,'claude-code',1,?2,0,0)",
            params![id, branch],
        )
        .unwrap();
    }

    #[allow(clippy::too_many_arguments)] // helper de test: una columna por argumento
    fn call(
        c: &Connection,
        id: &str,
        s: &str,
        ts: i64,
        model: &str,
        input: i64,
        cache_read: i64,
        turn: Option<&str>,
    ) {
        c.execute(
            "INSERT INTO calls (message_id,session_id,ts,model,input_tokens,cache_read,turn_id) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![id, s, ts, model, input, cache_read, turn],
        )
        .unwrap();
    }

    #[test]
    fn sin_avisos() {
        let c = db::open_in_memory().unwrap();
        testdata::seed(&c);
        assert!(compute(&c, &Filter::default(), 10_000, 0)
            .unwrap()
            .is_empty());
    }

    #[test]
    fn compactaciones() {
        let c = conn();
        session(&c, "a", "feat/x");
        session(&c, "b", "main");
        call(&c, "m1", "a", 1000, "claude-sonnet-5", 10, 0, None);
        call(&c, "m2", "b", 2000, "claude-sonnet-5", 10, 0, None);
        for (s, n) in [("a", 4), ("b", 3)] {
            for i in 0..n {
                c.execute(
                    "INSERT INTO events (session_id, ts, kind) VALUES (?1, ?2, 'compaction')",
                    params![s, i],
                )
                .unwrap();
            }
        }
        let f = compactions(&c, &Filter::default()).unwrap().unwrap();
        assert_eq!(
            (
                f.severity.as_str(),
                &f.params["n"],
                &f.params["branch"],
                &f.params["max"]
            ),
            ("critical", &json!(2), &json!("feat/x"), &json!(4))
        );
    }

    #[test]
    fn modelo_caro_en_exploracion() {
        let c = conn();
        session(&c, "a", "main");
        c.execute_batch(
            "INSERT INTO turns (id, session_id, ts) VALUES ('t1','a',1000);
             INSERT INTO tool_calls (call_id,session_id,ts,tool,turn_id) VALUES ('u1','a',1000,'Read','t1');",
        )
        .unwrap();
        // 2M de entrada en claude-opus-4-5 (5 USD/M) = 10 USD de exploración.
        call(
            &c,
            "m1",
            "a",
            1000,
            "claude-opus-4-5",
            2_000_000,
            0,
            Some("t1"),
        );
        let f = expensive_model(&c, &Filter::default()).unwrap().unwrap();
        let saving = f.params["saving"].as_f64().unwrap();
        // claude-sonnet-5 = 2 USD/M → ahorro 10 × (1 − 2/5) = 6
        assert!((saving - 6.0).abs() < 1e-9, "{saving}");
        assert_eq!(f.params["model"], "claude-opus-4-5");
    }

    #[test]
    fn herramienta_que_falla_con_su_comando() {
        let c = conn();
        session(&c, "a", "main");
        for i in 0..100 {
            let (target, err) = if i < 9 {
                ("npm test", 1)
            } else if i < 14 {
                ("cargo build", 1)
            } else {
                ("ls", 0)
            };
            c.execute(
                "INSERT INTO tool_calls (call_id,session_id,ts,tool,target,is_error) VALUES (?1,'a',?2,'Bash',?3,?4)",
                params![format!("u{i}"), i, target, err],
            )
            .unwrap();
        }
        let v = tool_errors(&c, &Filter::default()).unwrap();
        assert_eq!(v.len(), 1);
        assert!((v[0].params["rate"].as_f64().unwrap() - 0.14).abs() < 1e-9);
        assert_eq!(
            (&v[0].params["command"], &v[0].params["commandErrors"]),
            (&json!("npm"), &json!(9))
        );
    }

    #[test]
    fn pico_de_gasto() {
        let c = conn();
        session(&c, "a", "main");
        // 10 días de 10 USD (sonnet-5 a 2 USD/M → 5M) y uno de 45 USD.
        for d in 0..10 {
            call(
                &c,
                &format!("m{d}"),
                "a",
                d * DAY + 1000,
                "claude-sonnet-5",
                5_000_000,
                0,
                None,
            );
        }
        call(
            &c,
            "pico",
            "a",
            10 * DAY + 1000,
            "claude-sonnet-5",
            22_500_000,
            0,
            None,
        );
        let f = spend_spike(&c, &Filter::default(), 0).unwrap().unwrap();
        assert!((f.params["cost"].as_f64().unwrap() - 45.0).abs() < 1e-9);
        assert_eq!(f.params["ts"], json!(10 * DAY));
        // Sin el pico, no hay aviso.
        c.execute("DELETE FROM calls WHERE message_id = 'pico'", [])
            .unwrap();
        assert!(spend_spike(&c, &Filter::default(), 0).unwrap().is_none());
    }

    #[test]
    fn caida_del_cache_hit() {
        let c = conn();
        session(&c, "a", "main");
        // Periodo anterior [0, 10): 96 %; actual [10, 20): 91 %.
        call(&c, "p", "a", 5, "claude-sonnet-5", 4, 96, None);
        call(&c, "n", "a", 15, "claude-sonnet-5", 9, 91, None);
        let f = Filter {
            from: Some(10),
            to: Some(20),
            ..Default::default()
        };
        let x = cache_drop(&c, &f, 20).unwrap().unwrap();
        assert!((x.params["pp"].as_f64().unwrap() - 5.0).abs() < 1e-6);
        assert!(
            cache_drop(&c, &Filter::default(), 20).unwrap().is_none(),
            "sin inicio no hay periodo anterior"
        );
    }

    #[test]
    fn ordenados_por_gravedad() {
        let mut v = [
            finding("a", "info", json!({}), String::new()),
            finding("b", "critical", json!({}), String::new()),
            finding("c", "warn", json!({}), String::new()),
        ];
        v.sort_by_key(|x| rank(&x.severity));
        assert_eq!(v.iter().map(|x| x.kind.as_str()).collect::<String>(), "bca");
    }
}
