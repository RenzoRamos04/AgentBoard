//! Importa los fixtures anonimizados de `tests/fixtures/` y comprueba los totales.

use agentboard_lib::providers::claude_code::ClaudeCode;
use agentboard_lib::providers::Provider;
use agentboard_lib::{db, ingest, queries};
use std::path::PathBuf;

fn fixtures(agent: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../tests/fixtures")
        .join(agent)
}

#[test]
fn claude_code_fixture() {
    let mut conn = db::open_in_memory().unwrap();
    let providers: Vec<Box<dyn Provider>> = vec![Box::new(ClaudeCode::with_roots(vec![fixtures(
        "claude_code",
    )]))];
    let stats = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(stats.files, 2, "sesión principal + subagente");
    assert_eq!(stats.errors, 0);

    let s = queries::summary(&conn, &queries::Filter::default(), 0).unwrap();
    assert_eq!(s.calls, 8, "msg_demo_1 aparece dos veces por streaming");
    assert_eq!(s.sessions, 1);
    assert!(s.unpriced_models.is_empty());

    fn count(conn: &rusqlite::Connection, sql: &str) -> i64 {
        conn.query_row(sql, [], |r| r.get(0)).unwrap()
    }
    let q = |sql: &str| count(&conn, sql);
    assert_eq!(q("SELECT COUNT(*) FROM turns"), 2);
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE turn_id IS NULL"), 0);
    assert_eq!(
        q("SELECT COUNT(*) FROM calls WHERE turn_id = 'p2'"),
        5,
        "3 principales + 2 del subagente"
    );
    assert_eq!(
        q("SELECT COUNT(*) FROM calls WHERE is_sidechain = 1 AND agent_id = 'a1b2c3'"),
        2
    );
    assert_eq!(
        q("SELECT is_error FROM tool_calls WHERE call_id='toolu_demo_1'"),
        1
    );
    assert_eq!(
        q("SELECT duration_ms FROM tool_calls WHERE call_id='toolu_demo_1'"),
        6000
    );
    assert_eq!(
        q("SELECT COUNT(*) FROM tool_calls WHERE agent_id = 'a1b2c3' AND detail = 'Explore'"),
        1
    );
    assert_eq!(q("SELECT COUNT(*) FROM events WHERE kind='compaction'"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM events WHERE kind='interruption'"),
        1
    );
    let intent: String = conn
        .query_row("SELECT intent FROM turns WHERE id='p1'", [], |r| r.get(0))
        .unwrap();
    assert_eq!(intent, "debug");
    let (name, branch): (String, String) = conn
        .query_row(
            "SELECT p.name, s.git_branch FROM sessions s JOIN projects p ON p.id = s.project_id",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!((name.as_str(), branch.as_str()), ("demo", "main"));
    let model: String = conn
        .query_row("SELECT model FROM sessions", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        model, "claude-opus-5-5",
        "las llamadas del subagente no cambian el modelo de la sesión"
    );

    let f = queries::Filter::default();
    let activity = agentboard_lib::insights::activity(&conn, &f).unwrap();
    let debug = activity
        .activities
        .iter()
        .find(|a| a.key == "debugging")
        .expect("turno p1 = debugging");
    assert_eq!(
        (debug.turns, debug.one_shot),
        (1, Some(0.0)),
        "reeditó lib.rs → no es 1-shot"
    );
    assert!(activity
        .activities
        .iter()
        .any(|a| a.key == "delegation" && a.turns == 1));
    assert_eq!(activity.models.len(), 1);
    assert_eq!(activity.models[0].model, "claude-opus-5-5");

    let daily = agentboard_lib::insights::activity_daily(&conn, &f, 0).unwrap();
    assert_eq!(daily.len(), 2, "dos turnos, dos actividades, mismo día");
    assert!(
        daily.iter().all(|d| d.ts == 1_789_862_400_000),
        "2026-09-20 UTC"
    );
    let by = |k: &str| queries::breakdown(&conn, &f, k).unwrap();
    let cmds = by("command");
    assert_eq!(
        cmds.iter().map(|r| r.key.as_str()).collect::<Vec<_>>(),
        vec!["cargo", "tail"]
    );
    let skills = by("skill");
    assert_eq!(
        skills
            .iter()
            .map(|r| (r.key.as_str(), r.calls))
            .collect::<Vec<_>>(),
        vec![("Explore", 1), ("dataviz", 1)],
        "empate en usos: más coste primero"
    );
    assert!(skills.iter().all(|r| r.cost_usd > 0.0));
    let mcp = by("mcp");
    assert_eq!((mcp[0].key.as_str(), mcp[0].calls), ("claude_ai_Slack", 1));
    assert!(
        !by("tool").iter().any(|r| r.key.starts_with("mcp__")),
        "core tools sin MCP"
    );
    let agents = by("agent_type");
    assert_eq!(
        (
            agents[0].label.as_str(),
            agents[0].agent.as_deref(),
            agents[0].calls
        ),
        ("Explore", Some("claude-code"), 2)
    );
    let projects = by("project");
    assert_eq!(projects[0].sessions, 1);
    assert_eq!(
        projects[0].overhead_tokens, 12003.0,
        "3 in + 12000 escritos en la primera llamada"
    );

    // Releer tras "actualizar la app" (file_state vacío) no duplica.
    conn.execute("DELETE FROM file_state", []).unwrap();
    ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(
        queries::summary(&conn, &queries::Filter::default(), 0)
            .unwrap()
            .calls,
        8
    );
    assert_eq!(count(&conn, "SELECT COUNT(*) FROM tool_calls"), 7);
}

#[test]
fn opencode_fixture() {
    use agentboard_lib::providers::opencode::OpenCode;
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("opencode");
    std::fs::create_dir_all(&root).unwrap();
    let db_path = root.join("opencode.db");
    let sql = std::fs::read_to_string(fixtures("opencode").join("opencode.sql")).unwrap();
    rusqlite::Connection::open(&db_path)
        .unwrap()
        .execute_batch(&sql)
        .unwrap();

    let mut conn = db::open_in_memory().unwrap();
    let providers: Vec<Box<dyn Provider>> = vec![Box::new(OpenCode::with_roots(vec![root]))];
    let stats = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!((stats.files, stats.errors), (1, 0));

    let f = queries::Filter::default();
    let s = queries::summary(&conn, &f, 0).unwrap();
    assert_eq!(s.calls, 3);
    assert_eq!(s.sessions, 1, "la sesión hija (subagente) no cuenta");
    assert!(
        s.unpriced_models.is_empty(),
        "big-pickle trae coste reportado"
    );
    // big-pickle: 0.0123 + 0.001 reportados; sonnet: precio de tabla (200×3 + 300×15 + 8400×0.3 + 100×3.75)/1e6
    let sonnet = (200.0 * 3.0 + 300.0 * 15.0 + 8400.0 * 0.3 + 100.0 * 3.75) / 1e6;
    assert!(
        (s.cost_usd - (0.0133 + sonnet)).abs() < 1e-9,
        "{}",
        s.cost_usd
    );

    let q = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
    assert_eq!(q("SELECT COUNT(*) FROM agents WHERE id = 'opencode'"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM turns"),
        1,
        "la sesión hija no abre turno"
    );
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE turn_id = 'msg_u1'"), 2);
    assert_eq!(
        q("SELECT is_error FROM tool_calls WHERE call_id = 'call_1'"),
        1
    );
    assert_eq!(
        q("SELECT duration_ms FROM tool_calls WHERE call_id = 'call_1'"),
        1000
    );
    assert_eq!(q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Bash'"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM calls WHERE is_sidechain = 1 AND agent_id = 'ses_child'"),
        1
    );
    assert_eq!(
        q("SELECT is_subagent FROM sessions WHERE id = 'ses_child'"),
        1
    );
    let intent: String = conn
        .query_row("SELECT intent FROM turns WHERE id='msg_u1'", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(intent, "debug");
    let name: String = conn
        .query_row("SELECT name FROM projects", [], |r| r.get(0))
        .unwrap();
    assert_eq!(name, "demo");
    let agents = queries::breakdown(&conn, &f, "agent_type").unwrap();
    assert_eq!(
        (
            agents[0].label.as_str(),
            agents[0].agent.as_deref(),
            agents[0].calls
        ),
        ("explore", Some("opencode"), 1)
    );

    // Segunda pasada sin cambios: solo se relee la ventana de solapamiento y no se duplica nada.
    let again = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(again.errors, 0);
    assert_eq!(queries::summary(&conn, &f, 0).unwrap().calls, 3);
}

#[test]
fn codex_fixture() {
    use agentboard_lib::providers::codex::Codex;
    let mut conn = db::open_in_memory().unwrap();
    let providers: Vec<Box<dyn Provider>> =
        vec![Box::new(Codex::with_roots(vec![
            fixtures("codex").join("sessions")
        ]))];
    let stats = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!((stats.files, stats.errors), (2, 0));

    let f = queries::Filter::default();
    let s = queries::summary(&conn, &f, 0).unwrap();
    assert_eq!(
        s.calls, 4,
        "3 respuestas + 1 del subagente; el token_count no se cuenta"
    );
    assert_eq!(s.sessions, 1, "el hilo hijo no cuenta como sesión");
    assert_eq!(s.cache_read, 21_000);
    assert_eq!(
        s.input_tokens,
        12000 - 9000 + 13000 - 12000 + 2000 + 1000,
        "input sin la parte cacheada"
    );
    assert!(s.unpriced_models.is_empty());

    let q = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
    assert_eq!(
        q("SELECT COUNT(*) FROM turns"),
        2,
        "la sesión hija no abre turno"
    );
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE turn_id = 'turn-1'"), 2);
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE turn_id = 'turn-2'"), 1);
    assert_eq!(
        q("SELECT is_error FROM tool_calls WHERE call_id = 'call_a1'"),
        1
    );
    assert_eq!(
        q("SELECT duration_ms FROM tool_calls WHERE call_id = 'call_a1'"),
        3000
    );
    assert_eq!(
        q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Bash'"),
        2,
        "shell + local_shell_call"
    );
    assert_eq!(q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Edit' AND target = 'src/pricing.rs' AND is_error = 0"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'mcp__mcp_docs__read_file'"),
        1
    );
    assert_eq!(
        q("SELECT COUNT(*) FROM events WHERE kind = 'compaction'"),
        1
    );
    assert_eq!(
        q("SELECT COUNT(*) FROM events WHERE kind = 'interruption'"),
        1
    );
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE is_sidechain = 1"), 1);
    let (i1, i2): (String, String) = conn
        .query_row("SELECT (SELECT intent FROM turns WHERE id='turn-1'), (SELECT intent FROM turns WHERE id='turn-2')", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap();
    assert_eq!((i1.as_str(), i2.as_str()), ("debug", "brainstorm"));
    let (name, branch, model): (String, String, String) = conn
        .query_row(
            "SELECT p.name, s.git_branch, s.model FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.is_subagent = 0",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(
        (name.as_str(), branch.as_str(), model.as_str()),
        ("demo", "feat/codex", "gpt-5-codex")
    );
    let cmds = queries::breakdown(&conn, &f, "command").unwrap();
    assert_eq!(
        cmds.iter().map(|r| r.key.as_str()).collect::<Vec<_>>(),
        vec!["cargo", "rg", "tail"]
    );
    let activity = agentboard_lib::insights::activity(&conn, &f).unwrap();
    assert!(activity
        .activities
        .iter()
        .any(|a| a.key == "debugging" && a.one_shot == Some(1.0)));
    assert!(activity.activities.iter().any(|a| a.key == "exploration"));

    // Reimportar no duplica.
    ingest::scan_all(&mut conn, &providers).unwrap();
    conn.execute("DELETE FROM file_state", []).unwrap();
    ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(queries::summary(&conn, &f, 0).unwrap().calls, 4);
}

#[test]
fn copilot_fixture() {
    use agentboard_lib::providers::copilot::Copilot;
    let mut conn = db::open_in_memory().unwrap();
    let providers: Vec<Box<dyn Provider>> =
        vec![Box::new(Copilot::with_roots(vec![
            fixtures("copilot").join("session-state")
        ]))];
    let stats = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!((stats.files, stats.errors), (1, 0));

    let f = queries::Filter::default();
    let s = queries::summary(&conn, &f, 0).unwrap();
    assert_eq!(s.calls, 4, "una llamada por assistant.message");
    assert_eq!(s.sessions, 1);
    assert_eq!(
        s.input_tokens,
        3000 + 2500,
        "totales de los cierres, repartidos entre las respuestas"
    );
    assert_eq!(s.cache_read, 9000);
    assert_eq!(s.cache_write, 1000);
    assert_eq!(s.output_tokens, 80 + 45);
    assert!(s.unpriced_models.is_empty());

    let q = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
    assert_eq!(q("SELECT COUNT(*) FROM agents WHERE id = 'copilot'"), 1);
    assert_eq!(q("SELECT COUNT(*) FROM turns"), 3);
    assert_eq!(
        q("SELECT COUNT(*) FROM calls WHERE model = 'claude-sonnet-4-5'"),
        2
    );
    assert_eq!(
        q("SELECT SUM(input_tokens) FROM calls WHERE model = 'claude-sonnet-4-5'"),
        3000
    );
    assert_eq!(
        q("SELECT input_tokens FROM calls WHERE message_id = 'msg4'"),
        500,
        "delta del segundo cierre"
    );
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE turn_id = 'turn1'"), 2);
    assert_eq!(
        q("SELECT is_error FROM tool_calls WHERE call_id = 'call_bash'"),
        1
    );
    assert_eq!(
        q("SELECT duration_ms FROM tool_calls WHERE call_id = 'call_bash'"),
        1000
    );
    assert_eq!(
        q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Edit' AND target = 'src/pricing.rs'"),
        1
    );
    assert_eq!(q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Read'"), 1);
    let (i1, i2): (String, String) = conn
        .query_row("SELECT (SELECT intent FROM turns WHERE id='turn1'), (SELECT intent FROM turns WHERE id='turn2')", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap();
    assert_eq!((i1.as_str(), i2.as_str()), ("debug", "brainstorm"));
    let (name, branch): (String, String) = conn
        .query_row(
            "SELECT p.name, s.git_branch FROM sessions s JOIN projects p ON p.id = s.project_id",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!((name.as_str(), branch.as_str()), ("demo", "main"));
    let activity = agentboard_lib::insights::activity(&conn, &f).unwrap();
    assert!(activity
        .activities
        .iter()
        .any(|a| a.key == "debugging" && a.one_shot == Some(1.0)));

    // Reimportar desde cero no duplica ni cambia los totales.
    conn.execute("DELETE FROM file_state", []).unwrap();
    ingest::scan_all(&mut conn, &providers).unwrap();
    let again = queries::summary(&conn, &f, 0).unwrap();
    assert_eq!((again.calls, again.input_tokens), (4, 5500));
}

#[test]
fn gemini_fixture() {
    use agentboard_lib::providers::gemini::Gemini;
    let mut conn = db::open_in_memory().unwrap();
    let providers: Vec<Box<dyn Provider>> =
        vec![Box::new(Gemini::with_roots(vec![
            fixtures("gemini").join("tmp")
        ]))];
    let stats = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!((stats.files, stats.errors), (2, 0));

    let f = queries::Filter::default();
    let s = queries::summary(&conn, &f, 0).unwrap();
    assert_eq!(s.calls, 4, "3 respuestas + 1 del subagente");
    assert_eq!(s.sessions, 1);
    assert_eq!(
        s.input_tokens,
        2000 + 1000 + 1000 + 400,
        "input sin la parte cacheada"
    );
    assert_eq!(s.cache_read, 8000);
    assert_eq!(s.output_tokens, 160 + 80 + 50 + 30);
    assert!(s.unpriced_models.is_empty());

    let q = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
    assert_eq!(q("SELECT COUNT(*) FROM agents WHERE id = 'gemini'"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM turns"),
        2,
        "el subagente no abre turno"
    );
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE turn_id = 'u1'"), 2);
    assert_eq!(q("SELECT is_error FROM tool_calls WHERE call_id = 't1'"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Edit' AND is_error = 0"),
        1
    );
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE is_sidechain = 1"), 1);
    let (i1, i2): (String, String) = conn
        .query_row("SELECT (SELECT intent FROM turns WHERE id='u1'), (SELECT intent FROM turns WHERE id='u2')", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .unwrap();
    assert_eq!((i1.as_str(), i2.as_str()), ("debug", "brainstorm"));
    let name: String = conn.query_row("SELECT p.name FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.is_subagent = 0", [], |r| r.get(0)).unwrap();
    assert_eq!(name, "demo", "la carpeta llega por $set.directories");
    // `invoke_agent` lanza el subagente: su tipo es `agent_name` y `agentId` enlaza el hilo.
    let types = agentboard_lib::insights::agent_types(&conn, &f).unwrap();
    assert_eq!(
        types
            .iter()
            .map(|r| (r.label.as_str(), r.calls))
            .collect::<Vec<_>>(),
        vec![("codebase_investigator", 1)]
    );
    conn.execute("DELETE FROM file_state", []).unwrap();
    ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(queries::summary(&conn, &f, 0).unwrap().calls, 4);
}

#[test]
fn cursor_fixture() {
    use agentboard_lib::providers::cursor::Cursor;
    let mut conn = db::open_in_memory().unwrap();
    let providers: Vec<Box<dyn Provider>> =
        vec![Box::new(Cursor::with_roots(vec![
            fixtures("cursor").join("projects")
        ]))];
    let stats = ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!((stats.files, stats.errors), (2, 0));

    let f = queries::Filter::default();
    let s = queries::summary(&conn, &f, 0).unwrap();
    assert_eq!(s.calls, 5, "4 respuestas + 1 del subagente");
    assert_eq!(s.sessions, 1);
    assert!(s.output_tokens > 0, "tokens estimados por caracteres");
    assert_eq!(s.unpriced_models, vec!["cursor-auto".to_string()]);

    let q = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
    assert_eq!(q("SELECT COUNT(*) FROM turns"), 2);
    assert_eq!(q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Bash' AND target = 'npm test 2>&1 | tail -5'"), 1);
    assert_eq!(
        q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Edit' AND target = 'src/app.js'"),
        1
    );
    assert_eq!(q("SELECT COUNT(*) FROM tool_calls WHERE tool = 'Grep'"), 1);
    assert_eq!(q("SELECT COUNT(*) FROM calls WHERE is_sidechain = 1"), 1);
    let intent: String = conn
        .query_row("SELECT intent FROM turns ORDER BY ts LIMIT 1", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(intent, "debug");
    let name: String = conn.query_row("SELECT p.name FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.is_subagent = 0", [], |r| r.get(0)).unwrap();
    assert_eq!(name, "demo");
    let ts: i64 = conn
        .query_row("SELECT ts FROM turns ORDER BY ts LIMIT 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(ts, 1_790_257_920_000, "24 sep 2026 06:52 UTC-7 = 13:52 UTC");
}

// ---------------------------------------------------------------------------
// Relectura en vivo: un log leído en dos pasadas, con proveedores distintos en cada una (como
// el vigilante), debe dar lo mismo que leerlo de una vez. Codex, Gemini, Cursor y Copilot solo
// identifican la sesión en sus primeras líneas.

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).unwrap();
    for e in std::fs::read_dir(from).unwrap().flatten() {
        let dest = to.join(e.file_name());
        if e.file_type().unwrap().is_dir() {
            copy_dir(&e.path(), &dest);
        } else {
            std::fs::copy(e.path(), dest).unwrap();
        }
    }
}

fn biggest_jsonl(dir: &std::path::Path) -> PathBuf {
    let mut best: Option<(u64, PathBuf)> = None;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        for e in std::fs::read_dir(&d).unwrap().flatten() {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
            } else if p.extension().is_some_and(|x| x == "jsonl") {
                let len = p.metadata().unwrap().len();
                if best.as_ref().is_none_or(|(l, _)| len > *l) {
                    best = Some((len, p));
                }
            }
        }
    }
    best.unwrap().1
}

fn totals(conn: &rusqlite::Connection) -> (i64, i64, i64, i64) {
    let q = |sql: &str| -> i64 { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
    (
        q("SELECT COUNT(*) FROM calls"),
        q("SELECT COUNT(*) FROM sessions"),
        q("SELECT COUNT(*) FROM tool_calls"),
        q("SELECT COUNT(*) FROM turns"),
    )
}

fn read_in_two_passes(fixture: &str, sub: &str, make: fn(Vec<PathBuf>) -> Box<dyn Provider>) {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join(sub);
    copy_dir(&fixtures(fixture).join(sub), &root);

    // Referencia: todo de una vez.
    let mut whole = db::open_in_memory().unwrap();
    let stats = ingest::scan_all(&mut whole, &[make(vec![root.clone()])]).unwrap();
    assert_eq!(stats.errors, 0, "{fixture}: lectura completa");
    let expected = totals(&whole);

    // Primera pasada con el archivo a medias; la segunda, con otra instancia del proveedor.
    let file = biggest_jsonl(&root);
    let full = std::fs::read_to_string(&file).unwrap();
    let lines: Vec<&str> = full.lines().collect();
    let half = lines[..lines.len() / 2].join("\n") + "\n";
    std::fs::write(&file, &half).unwrap();
    let mut conn = db::open_in_memory().unwrap();
    ingest::scan_all(&mut conn, &[make(vec![root.clone()])]).unwrap();
    std::fs::write(&file, &full).unwrap();
    let second = ingest::scan_all(&mut conn, &[make(vec![root.clone()])]).unwrap();
    assert_eq!(
        second.errors, 0,
        "{fixture}: la segunda pasada no debe fallar"
    );
    assert_eq!(
        totals(&conn),
        expected,
        "{fixture}: dos pasadas = una lectura completa"
    );
}

#[test]
fn relectura_en_dos_pasadas_de_agentes_con_estado() {
    use agentboard_lib::providers::{
        codex::Codex, copilot::Copilot, cursor::Cursor, gemini::Gemini,
    };
    read_in_two_passes("codex", "sessions", |r| Box::new(Codex::with_roots(r)));
    read_in_two_passes("gemini", "tmp", |r| Box::new(Gemini::with_roots(r)));
    read_in_two_passes("cursor", "projects", |r| Box::new(Cursor::with_roots(r)));
    read_in_two_passes("copilot", "session-state", |r| {
        Box::new(Copilot::with_roots(r))
    });
}

#[test]
fn opencode_no_pierde_filas_con_el_mismo_time_updated_que_el_cursor() {
    use agentboard_lib::providers::opencode::OpenCode;
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("opencode");
    std::fs::create_dir_all(&root).unwrap();
    let db_path = root.join("opencode.db");
    let sql = std::fs::read_to_string(fixtures("opencode").join("opencode.sql")).unwrap();
    let oc = rusqlite::Connection::open(&db_path).unwrap();
    oc.execute_batch(&sql).unwrap();

    let providers: Vec<Box<dyn Provider>> =
        vec![Box::new(OpenCode::with_roots(vec![root.clone()]))];
    let mut conn = db::open_in_memory().unwrap();
    ingest::scan_all(&mut conn, &providers).unwrap();
    let calls = |c: &rusqlite::Connection| -> i64 {
        c.query_row("SELECT COUNT(*) FROM calls", [], |r| r.get(0))
            .unwrap()
    };
    let before = calls(&conn);

    // Llega tarde un mensaje con el MISMO time_updated que la última fila ya leída (el cursor).
    oc.execute_batch(
        "INSERT INTO message (id, session_id, time_created, time_updated, data)
         SELECT 'msg_tarde', session_id, time_created,
                (SELECT MAX(t) FROM (SELECT MAX(time_updated) AS t FROM message UNION ALL SELECT MAX(time_updated) FROM part UNION ALL SELECT MAX(time_updated) FROM session)),
                data
         FROM message WHERE json_extract(data, '$.role') = 'assistant' LIMIT 1;",
    )
    .unwrap();
    ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(
        calls(&conn),
        before + 1,
        "la fila con el mismo time_updated que el cursor no se pierde"
    );
    // Y releer la ventana de solapamiento no duplica.
    ingest::scan_all(&mut conn, &providers).unwrap();
    assert_eq!(calls(&conn), before + 1);
}
