//! Días y horas locales con las reglas históricas de la zona (verano/invierno incluidos):
//! aplicar a todas las fechas el desfase de hoy desplaza las cercanas a un cambio de hora.

use chrono::{Duration, LocalResult, NaiveDateTime, TimeZone, Timelike};
use chrono_tz::Tz;

/// Zona IANA pedida; si no existe, la del sistema; y si tampoco, UTC.
pub fn parse(name: &str) -> Tz {
    name.parse().ok().or_else(system).unwrap_or(chrono_tz::UTC)
}

/// Zona IANA del sistema (para el binario MCP y la bandeja; la UI manda la del navegador).
pub fn system() -> Option<Tz> {
    iana_time_zone::get_timezone().ok()?.parse().ok()
}

pub fn system_name() -> String {
    iana_time_zone::get_timezone().unwrap_or_else(|_| "UTC".into())
}

/// Instante UTC (ms) de una hora local, resolviendo huecos y repeticiones del cambio de hora.
fn resolve(local: NaiveDateTime, tz: &Tz) -> i64 {
    match tz.from_local_datetime(&local) {
        LocalResult::Single(dt) => dt.timestamp_millis(),
        LocalResult::Ambiguous(first, _) => first.timestamp_millis(),
        // Hora saltada (p. ej. una medianoche inexistente): vale la siguiente.
        LocalResult::None => tz
            .from_local_datetime(&(local + Duration::hours(1)))
            .earliest()
            .map(|dt| dt.timestamp_millis())
            .unwrap_or_default(),
    }
}

/// Inicio del día local de `ts`, en epoch ms UTC.
pub fn day_start(ts: i64, tz: &Tz) -> i64 {
    let local = tz.timestamp_millis_opt(ts).unwrap().naive_local();
    resolve(
        local
            .date()
            .and_hms_opt(0, 0, 0)
            .expect("medianoche válida"),
        tz,
    )
}

/// Inicio de la hora local de `ts`, en epoch ms UTC.
pub fn hour_start(ts: i64, tz: &Tz) -> i64 {
    let local = tz.timestamp_millis_opt(ts).unwrap().naive_local();
    let hora = local
        .with_minute(0)
        .and_then(|d| d.with_second(0))
        .and_then(|d| d.with_nanosecond(0))
        .expect("hora en punto válida");
    resolve(hora, tz)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn ms(y: i32, mo: u32, d: u32, h: u32, mi: u32) -> i64 {
        Utc.with_ymd_and_hms(y, mo, d, h, mi, 0)
            .unwrap()
            .timestamp_millis()
    }

    #[test]
    fn cada_fecha_usa_su_horario_de_verano_o_invierno() {
        let tz = parse("Europe/Madrid");
        // Enero (UTC+1): las 23:30Z son las 00:30 del 16; su medianoche local es 23:00Z del 15.
        assert_eq!(
            day_start(ms(2026, 1, 15, 23, 30), &tz),
            ms(2026, 1, 15, 23, 0)
        );
        // Julio (UTC+2): las 22:30Z son las 00:30 del 16; su medianoche local es 22:00Z del 15.
        assert_eq!(
            day_start(ms(2026, 7, 15, 22, 30), &tz),
            ms(2026, 7, 15, 22, 0)
        );
        assert_eq!(
            hour_start(ms(2026, 7, 15, 22, 30), &tz),
            ms(2026, 7, 15, 22, 0)
        );
    }

    #[test]
    fn zona_desconocida_no_revienta() {
        let tz = parse("Zona/Inventada");
        assert!(day_start(0, &tz) <= 0);
    }
}
