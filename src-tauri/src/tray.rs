//! Menú de la bandeja del sistema: al abrirlo muestra el gasto de hoy con su sparkline
//! por horas, los proyectos usados hoy con una barra proporcional y la sesión activa
//! (o la última), sobre las acciones «Mostrar AgentBoard» y «Salir». Los menús de la
//! bandeja no admiten imágenes, así que los «gráficos» son caracteres de bloque en el
//! propio texto. Se reconstruye tras cada escaneo, que es cuando cambian los datos.

use crate::queries::{self, Filter};
use crate::{alerts, sessions};
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIcon;
use tauri::Wry;

/// Máximo de proyectos listados; el resto se resume en «… y N más».
const MAX_PROJECTS: usize = 5;
/// Una sesión con datos más recientes que esto se considera activa.
const ACTIVE_MS: i64 = 15 * 60 * 1000;
/// Hacia atrás, cuánto se busca la última sesión (30 días).
const LOOKBACK_MS: i64 = 30 * 24 * 60 * 60 * 1000;
/// Ancho de la barra de cada proyecto, en celdas.
const BAR_WIDTH: usize = 10;
/// Octavos de celda para rematar la barra; el último es la celda llena.
const EIGHTHS: [char; 8] = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
/// Niveles de la sparkline, de menor a mayor.
const LEVELS: [char; 8] = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/// Sesión con los datos más recientes: proyecto, agente y su última llamada.
#[derive(Debug, Clone, PartialEq)]
pub struct LastSession {
    pub project: Option<String>,
    pub agent: String,
    /// Última llamada registrada (epoch ms).
    pub ended_at: i64,
}

/// Datos ya consultados con los que se pinta el menú.
#[derive(Debug, Default, PartialEq)]
pub struct MenuData {
    /// Gasto del día local en curso, en dólares.
    pub today_usd: f64,
    /// Gasto de hoy por hora local, de las 00h a la hora en curso.
    pub hours: Vec<f64>,
    /// (proyecto, gasto de hoy) de los proyectos usados hoy.
    pub projects: Vec<(String, f64)>,
    /// Sesión más reciente de los últimos 30 días; `None` sin sesiones.
    pub last_session: Option<LastSession>,
}

/// Consulta la base y reúne los datos del menú.
pub fn menu_data(conn: &Connection, now_ms: i64) -> MenuData {
    let today = Filter {
        from: Some(alerts::today_start()),
        ..Default::default()
    };
    let projects = queries::breakdown(conn, &today, "project")
        .unwrap_or_default()
        .into_iter()
        .map(|r| (r.label, r.cost_usd))
        .collect();
    let recent = Filter {
        from: Some(now_ms - LOOKBACK_MS),
        ..Default::default()
    };
    let last_session = sessions::list_sessions(conn, &recent, Some(200))
        .map(|l| l.sessions)
        .unwrap_or_default()
        .into_iter()
        .max_by_key(|s| s.ended_at)
        .map(|s| LastSession {
            project: s.project,
            agent: s.agent_name,
            ended_at: s.ended_at,
        });
    MenuData {
        today_usd: alerts::today_spent(conn).unwrap_or(0.0),
        hours: today_by_hour(conn, &today, now_ms),
        projects,
        last_session,
    }
}

/// Gasto de hoy por hora local, de las 00h a la hora en curso (huecos a 0).
fn today_by_hour(conn: &Connection, today: &Filter, now_ms: i64) -> Vec<f64> {
    use chrono::{Local, Offset, TimeZone, Timelike};
    let Some(now) = Local.timestamp_millis_opt(now_ms).single() else {
        return Vec::new();
    };
    let mut hours = vec![0.0; now.hour() as usize + 1];
    let offset_min = i64::from(now.offset().fix().local_minus_utc()) / 60;
    for p in queries::timeseries(conn, today, "hour", offset_min).unwrap_or_default() {
        // `p.ts` es el inicio de la hora en epoch ms; se indexa por su hora local.
        let slot = Local
            .timestamp_millis_opt(p.ts)
            .single()
            .and_then(|t| hours.get_mut(t.hour() as usize));
        if let Some(slot) = slot {
            *slot += p.cost_usd;
        }
    }
    hours
}

/// Bloques de líneas informativas del menú; entre bloque y bloque va un separador.
pub fn format_menu(data: &MenuData, now_ms: i64) -> Vec<Vec<String>> {
    let mut today = vec![format!("Hoy: ${:.2}", data.today_usd)];
    if !data.hours.is_empty() {
        today.push(sparkline(&data.hours));
    }
    let mut blocks = vec![today];
    if !data.projects.is_empty() {
        let mut by_cost: Vec<&(String, f64)> = data.projects.iter().collect();
        by_cost.sort_by(|a, b| b.1.total_cmp(&a.1));
        // Barras relativas al proyecto más caro del día.
        let max = by_cost.first().map_or(0.0, |p| p.1);
        let mut lines: Vec<String> = by_cost
            .iter()
            .take(MAX_PROJECTS)
            .map(|p| format!("{} {} · ${:.2}", bar(p.1, max), p.0, p.1))
            .collect();
        let rest = by_cost.len().saturating_sub(MAX_PROJECTS);
        if rest > 0 {
            lines.push(format!("… y {rest} más"));
        }
        blocks.push(lines);
    }
    blocks.push(vec![session_line(data.last_session.as_ref(), now_ms)]);
    blocks
}

/// Barra de `BAR_WIDTH` celdas proporcional a `cost / max`, rematada en octavos
/// de celda; nunca vacía para que todos los proyectos se vean («▏» como mínimo).
fn bar(cost: f64, max: f64) -> String {
    let eighths = if max > 0.0 {
        ((cost / max) * (BAR_WIDTH * 8) as f64).round() as usize
    } else {
        0
    };
    if eighths == 0 {
        return EIGHTHS[0].to_string();
    }
    let mut s = "█".repeat(eighths / 8);
    if eighths % 8 > 0 {
        s.push(EIGHTHS[eighths % 8 - 1]);
    }
    s
}

/// Sparkline del gasto por horas normalizada al máximo de la jornada; sin gasto = «▁».
fn sparkline(hours: &[f64]) -> String {
    let max = hours.iter().copied().fold(0.0_f64, f64::max);
    hours
        .iter()
        .map(|&c| {
            if max <= 0.0 || c <= 0.0 {
                LEVELS[0]
            } else {
                // Con gasto siempre se sube al menos un nivel sobre «▁».
                LEVELS[((c / max) * 7.0).ceil().clamp(1.0, 7.0) as usize]
            }
        })
        .collect()
}

/// «● Activa» con datos de hace menos de 15 min; si no, «Última» o «Sin sesiones».
fn session_line(last: Option<&LastSession>, now_ms: i64) -> String {
    let Some(s) = last else {
        return "Sin sesiones".into();
    };
    let project = s.project.as_deref().unwrap_or("(sin proyecto)");
    let elapsed = (now_ms - s.ended_at).max(0);
    if elapsed < ACTIVE_MS {
        format!("● Activa: {project} · {}", s.agent)
    } else if elapsed < 60 * 60 * 1000 {
        format!("Última: {project} · hace {} min", elapsed / 60_000)
    } else {
        format!("Última: {project} · hace {} h", elapsed / 3_600_000)
    }
}

/// Reconstruye el menú de la bandeja con los datos actuales de la base.
pub fn refresh(app: &tauri::AppHandle, db: &Arc<Mutex<Connection>>, tray: &TrayIcon) {
    let now_ms = chrono::Utc::now().timestamp_millis();
    let data = match db.lock() {
        Ok(conn) => menu_data(&conn, now_ms),
        Err(_) => return,
    };
    match build_menu(app, &format_menu(&data, now_ms)) {
        Ok(menu) => {
            let _ = tray.set_menu(Some(menu));
        }
        Err(e) => eprintln!("agentboard: no se pudo reconstruir el menú de la bandeja: {e}"),
    }
}

/// Menú de Tauri: líneas informativas deshabilitadas, separadores y las acciones de siempre.
fn build_menu(app: &tauri::AppHandle, blocks: &[Vec<String>]) -> tauri::Result<Menu<Wry>> {
    let mut items: Vec<Box<dyn IsMenuItem<Wry>>> = Vec::new();
    for block in blocks.iter().filter(|b| !b.is_empty()) {
        for line in block {
            // `&` marca mnemónicos en los menús; doblado se muestra literal.
            let text = line.replace('&', "&&");
            items.push(Box::new(MenuItem::new(app, text, false, None::<&str>)?));
        }
        items.push(Box::new(PredefinedMenuItem::separator(app)?));
    }
    // Las mismas acciones (e ids) que el menú inicial de `build_tray`.
    items.push(Box::new(MenuItem::with_id(
        app,
        "show",
        "Mostrar AgentBoard",
        true,
        None::<&str>,
    )?));
    items.push(Box::new(MenuItem::with_id(
        app,
        "quit",
        "Salir",
        true,
        None::<&str>,
    )?));
    let refs: Vec<&dyn IsMenuItem<Wry>> = items.iter().map(|i| i.as_ref()).collect();
    Menu::with_items(app, &refs)
}

#[cfg(test)]
mod tests {
    use super::*;

    const MIN: i64 = 60_000;

    fn data(projects: &[(&str, f64)], last_session: Option<LastSession>) -> MenuData {
        MenuData {
            today_usd: 12.339,
            hours: Vec::new(),
            projects: projects.iter().map(|(n, c)| (n.to_string(), *c)).collect(),
            last_session,
        }
    }

    fn last(project: Option<&str>, ended_at: i64) -> Option<LastSession> {
        Some(LastSession {
            project: project.map(Into::into),
            agent: "Claude Code".into(),
            ended_at,
        })
    }

    #[test]
    fn gasto_de_hoy_con_dos_decimales() {
        let blocks = format_menu(&data(&[], None), 0);
        assert_eq!(blocks[0], vec!["Hoy: $12.34".to_string()]);
    }

    #[test]
    fn proyectos_por_coste_descendente_y_como_mucho_cinco() {
        let d = data(
            &[
                ("a", 1.0),
                ("b", 7.0),
                ("c", 3.0),
                ("d", 0.5),
                ("e", 2.0),
                ("f", 4.0),
                ("g", 6.0),
            ],
            None,
        );
        let lines = &format_menu(&d, 0)[1];
        let order = [
            "b · $7.00",
            "g · $6.00",
            "f · $4.00",
            "c · $3.00",
            "e · $2.00",
        ];
        assert_eq!(lines.len(), 6);
        for (line, end) in lines.iter().zip(order) {
            assert!(line.ends_with(end), "{line} debería acabar en {end}");
        }
        assert_eq!(lines[5], "… y 2 más");
    }

    #[test]
    fn lineas_de_proyecto_con_su_barra_delante() {
        let d = data(
            &[("src", 88.52), ("AgentBoard", 20.55), ("renzo", 0.01)],
            None,
        );
        assert_eq!(
            format_menu(&d, 0)[1],
            vec![
                "██████████ src · $88.52".to_string(),
                "██▍ AgentBoard · $20.55".into(),
                "▏ renzo · $0.01".into(),
            ]
        );
    }

    #[test]
    fn barra_llena_media_y_vacia() {
        assert_eq!(bar(7.0, 7.0), "██████████");
        assert_eq!(bar(3.5, 7.0), "█████");
        // Sin gasto (o sin máximo) la barra no desaparece.
        assert_eq!(bar(0.0, 7.0), "▏");
        assert_eq!(bar(0.0, 0.0), "▏");
    }

    #[test]
    fn sparkline_normalizada_al_maximo_de_la_jornada() {
        assert_eq!(sparkline(&[0.0, 1.0, 4.0, 8.0]), "▁▂▅█");
        // Va como segunda línea del bloque «Hoy».
        let d = MenuData {
            hours: vec![0.0, 1.0, 4.0, 8.0],
            ..data(&[], None)
        };
        assert_eq!(
            format_menu(&d, 0)[0],
            vec!["Hoy: $12.34".to_string(), "▁▂▅█".into()]
        );
    }

    #[test]
    fn dia_sin_gasto_con_la_sparkline_al_minimo() {
        assert_eq!(sparkline(&[0.0, 0.0, 0.0, 0.0, 0.0]), "▁▁▁▁▁");
    }

    #[test]
    fn cinco_proyectos_justos_no_resumen_nada() {
        let d = data(
            &[("a", 1.0), ("b", 2.0), ("c", 3.0), ("d", 4.0), ("e", 5.0)],
            None,
        );
        let lines = &format_menu(&d, 0)[1];
        assert_eq!(lines.len(), 5);
        assert!(!lines.iter().any(|l| l.contains("más")));
    }

    #[test]
    fn sin_proyectos_no_hay_bloque_de_proyectos() {
        // Solo «Hoy» y la línea de sesión.
        assert_eq!(format_menu(&data(&[], None), 0).len(), 2);
    }

    #[test]
    fn sesion_activa_con_datos_de_hace_menos_de_15_min() {
        let now = 100 * MIN;
        let blocks = format_menu(&data(&[], last(Some("AgentBoard"), now - 14 * MIN)), now);
        assert_eq!(
            blocks.last().unwrap()[0],
            "● Activa: AgentBoard · Claude Code"
        );
    }

    #[test]
    fn ultima_sesion_en_minutos_y_luego_en_horas() {
        let now = 10_000 * MIN;
        // A los 15 min justos ya no cuenta como activa.
        let d = data(&[], last(Some("AgentBoard"), now - 15 * MIN));
        assert_eq!(
            format_menu(&d, now).last().unwrap()[0],
            "Última: AgentBoard · hace 15 min"
        );
        let d = data(&[], last(Some("AgentBoard"), now - 3 * 60 * MIN));
        assert_eq!(
            format_menu(&d, now).last().unwrap()[0],
            "Última: AgentBoard · hace 3 h"
        );
    }

    #[test]
    fn sesion_sin_proyecto_y_base_sin_sesiones() {
        let now = 100 * MIN;
        let blocks = format_menu(&data(&[], last(None, now - 5 * MIN)), now);
        assert_eq!(
            blocks.last().unwrap()[0],
            "● Activa: (sin proyecto) · Claude Code"
        );
        assert_eq!(
            format_menu(&data(&[], None), now).last().unwrap()[0],
            "Sin sesiones"
        );
    }
}
