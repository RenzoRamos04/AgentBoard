//! Bandeja del sistema y avisos de presupuesto. Tras cada relectura, actualiza el texto de la
//! bandeja con el gasto del mes y avisa una vez al llegar al 80 % y al 100 % de cada presupuesto:
//! mensual, diario y mensuales por proyecto o agente.

use crate::{queries, settings};
use anyhow::Result;
use rusqlite::{params_from_iter, Connection};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use tauri::tray::TrayIcon;
use tauri_plugin_notification::NotificationExt;

/// Un presupuesto frente a su valor actual (proyección del mes o gasto del día).
#[derive(Debug, Clone, PartialEq)]
pub struct Check {
    /// Identifica el presupuesto para no repetir avisos (`month`, `day`, `project:/repo`…).
    pub id: String,
    /// «tu presupuesto mensual», «el presupuesto de Codex CLI»…
    pub name: String,
    /// «La proyección del mes», «El gasto de hoy».
    pub measure: &'static str,
    pub value: f64,
    pub limit: f64,
}

/// Avisos (título, texto) pendientes; marca en `notified` los umbrales avisados.
pub fn pending(checks: &[Check], notified: &mut HashSet<String>) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for c in checks.iter().filter(|c| c.limit > 0.0) {
        let ratio = c.value / c.limit;
        let (k80, k100) = (format!("{}:80", c.id), format!("{}:100", c.id));
        if ratio >= 1.0 && !notified.contains(&k100) {
            out.push((
                "Presupuesto superado".to_string(),
                format!(
                    "{} (${:.2}) supera {} de ${:.2}.",
                    c.measure, c.value, c.name, c.limit
                ),
            ));
            notified.insert(k100);
            notified.insert(k80);
        } else if ratio >= 0.8 && !notified.contains(&k80) {
            out.push((
                "Cerca del presupuesto".to_string(),
                format!(
                    "{} va por el {:.0}% de {} de ${:.2}.",
                    c.measure,
                    ratio * 100.0,
                    c.name,
                    c.limit
                ),
            ));
            notified.insert(k80);
        }
    }
    out
}

/// Inicio del día local en curso (epoch ms).
fn today_start() -> i64 {
    use chrono::{Local, TimeZone};
    let now = Local::now().date_naive();
    Local
        .from_local_datetime(&now.and_hms_opt(0, 0, 0).expect("medianoche válida"))
        .earliest()
        .map(|d| d.timestamp_millis())
        .unwrap_or(0)
}

/// Comprobaciones de todos los presupuestos de los ajustes.
pub fn checks(conn: &Connection, s: &settings::Settings) -> Result<Vec<Check>> {
    let mut out = Vec::new();
    let (_, projection) = queries::month_progress(conn, &queries::Filter::default())?;
    if let Some(b) = s.monthly_budget {
        out.push(Check {
            id: "month".into(),
            name: "tu presupuesto mensual".into(),
            measure: "La proyección del mes",
            value: projection,
            limit: b,
        });
    }
    if let Some(b) = s.daily_budget {
        let today = queries::Filter {
            from: Some(today_start()),
            ..Default::default()
        };
        let (w, args) = today.sql("c.ts");
        let spent: f64 = conn.query_row(
            &format!("SELECT COALESCE(SUM(c.cost_usd),0) FROM call_costs c JOIN sessions s ON s.id = c.session_id WHERE {w}"),
            params_from_iter(args.iter()),
            |r| r.get(0),
        )?;
        out.push(Check {
            id: "day".into(),
            name: "tu presupuesto diario".into(),
            measure: "El gasto de hoy",
            value: spent,
            limit: b,
        });
    }
    if !s.budgets.is_empty() {
        let (start, factor) = queries::month_factor();
        let month = queries::Filter {
            from: Some(start),
            ..Default::default()
        };
        let projects = queries::breakdown(conn, &month, "project")?;
        let agents = queries::breakdown(conn, &month, "agent")?;
        for b in &s.budgets {
            let rows = if b.kind == "project" {
                &projects
            } else {
                &agents
            };
            let spent = rows
                .iter()
                .find(|r| r.key == b.key)
                .map_or(0.0, |r| r.cost_usd);
            out.push(Check {
                id: format!("{}:{}", b.kind, b.key),
                name: format!("el presupuesto de {}", b.label),
                measure: "La proyección del mes",
                value: spent * factor,
                limit: b.monthly,
            });
        }
    }
    Ok(out)
}

/// Umbrales de presupuesto ya avisados en esta sesión de la app.
#[derive(Default)]
pub struct Alerts {
    notified: Mutex<HashSet<String>>,
}

impl Alerts {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Recalcula tras un escaneo: refresca la bandeja y lanza los avisos de presupuesto pendientes.
    pub fn refresh(&self, app: &tauri::AppHandle, db: &Arc<Mutex<Connection>>, tray: &TrayIcon) {
        let s = settings::load();
        let (month, checks) = match db.lock() {
            Ok(conn) => (
                queries::month_progress(&conn, &queries::Filter::default()).unwrap_or((0.0, 0.0)),
                checks(&conn, &s).unwrap_or_default(),
            ),
            Err(_) => return,
        };
        let (spent, projection) = month;
        let _ = tray.set_tooltip(Some(&format!(
            "AgentBoard — este mes: ${spent:.2} (proyección ${projection:.2})"
        )));

        let Ok(mut notified) = self.notified.lock() else {
            return;
        };
        for (title, body) in pending(&checks, &mut notified) {
            let _ = app
                .notification()
                .builder()
                .title(&title)
                .body(&body)
                .show();
        }
    }

    /// Al cambiar los presupuestos en Ajustes, se vuelven a permitir los avisos.
    pub fn reset(&self) {
        if let Ok(mut n) = self.notified.lock() {
            n.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::queries::testdata;
    use crate::settings::{ScopedBudget, Settings};

    fn check(id: &str, value: f64, limit: f64) -> Check {
        Check {
            id: id.into(),
            name: format!("el presupuesto de {id}"),
            measure: "La proyección del mes",
            value,
            limit,
        }
    }

    #[test]
    fn avisa_una_vez_por_umbral() {
        let mut notified = HashSet::new();
        let a = pending(&[check("codex", 58.0, 60.0)], &mut notified);
        assert_eq!(a.len(), 1);
        assert_eq!(a[0].0, "Cerca del presupuesto");
        assert!(a[0].1.contains("97%"));
        // Misma situación: no se repite.
        assert!(pending(&[check("codex", 58.0, 60.0)], &mut notified).is_empty());
        // Al superarlo, aviso del 100 % (una vez).
        let b = pending(&[check("codex", 61.0, 60.0)], &mut notified);
        assert_eq!(b[0].0, "Presupuesto superado");
        assert!(pending(&[check("codex", 70.0, 60.0)], &mut notified).is_empty());
    }

    #[test]
    fn directo_al_100_marca_tambien_el_80() {
        let mut notified = HashSet::new();
        assert_eq!(pending(&[check("day", 31.0, 30.0)], &mut notified).len(), 1);
        assert!(pending(&[check("day", 25.0, 30.0)], &mut notified).is_empty());
    }

    #[test]
    fn sin_limite_o_por_debajo_no_avisa() {
        let mut notified = HashSet::new();
        assert!(pending(
            &[check("a", 10.0, 0.0), check("b", 1.0, 60.0)],
            &mut notified
        )
        .is_empty());
    }

    #[test]
    fn comprobaciones_de_los_ajustes() {
        let conn = db::open_in_memory().unwrap();
        testdata::seed(&conn);
        let s = Settings {
            monthly_budget: Some(50.0),
            daily_budget: Some(5.0),
            budgets: vec![ScopedBudget {
                kind: "agent".into(),
                key: "codex".into(),
                label: "Codex".into(),
                monthly: 10.0,
            }],
            ..Default::default()
        };
        let c = checks(&conn, &s).unwrap();
        assert_eq!(
            c.iter().map(|x| x.id.as_str()).collect::<Vec<_>>(),
            vec!["month", "day", "agent:codex"]
        );
        assert!(c.iter().all(|x| x.value >= 0.0));
    }
}
