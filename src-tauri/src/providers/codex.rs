//! Codex CLI: `~/.codex/sessions/YYYY/MM/DD/rollout-<fecha>-<thread>.jsonl` (y `archived_sessions/`).
//! Cada línea es `{"timestamp","type","payload"}`; el tipo va en `type`: `session_meta`,
//! `turn_context`, `token_usage_record`, `response_item`, `event_msg`, `compacted`…
//!
//! A diferencia de Claude Code, el modelo y la carpeta no van en cada línea: se guardan por
//! archivo en `state` mientras se lee.

use super::{
    parse_ts, prompt_intent, CallRec, EventRec, Provider, Record, SessionRec, ToolUseRec, TurnRec,
};
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

#[derive(Default)]
pub struct Codex {
    roots: Option<Vec<PathBuf>>,
    state: Mutex<HashMap<PathBuf, FileState>>,
}

/// Lo que se sabe de una sesión tras leer sus primeras líneas.
#[derive(Default, Clone)]
struct FileState {
    thread_id: String,
    cwd: Option<String>,
    branch: Option<String>,
    model: String,
    is_subagent: bool,
    turn_id: Option<String>,
    /// Texto del último prompt humano, a la espera de su `turn_context` (no se guarda).
    pending_prompt: Option<String>,
    /// Con `token_usage_record` presentes se ignoran los `token_count` (formato antiguo).
    has_usage_records: bool,
    /// Con eventos `item_completed` (formato nuevo) las herramientas salen de ellos y se ignoran
    /// los `function_call` de `response_item`, para no contarlas dos veces.
    has_items: bool,
}

impl Codex {
    pub fn with_roots(roots: Vec<PathBuf>) -> Self {
        Self {
            roots: Some(roots),
            state: Mutex::default(),
        }
    }

    fn home() -> Option<PathBuf> {
        match std::env::var_os("CODEX_HOME") {
            Some(h) if !h.is_empty() => Some(PathBuf::from(h)),
            _ => dirs::home_dir().map(|h| h.join(".codex")),
        }
    }
}

/// Nombres de herramienta de Codex → los de Claude Code (misma clasificación y 1-shot).
fn canonical_tool(name: &str) -> &str {
    match name {
        "shell" | "shell_command" | "local_shell" | "exec_command" | "container.exec" => "Bash",
        "apply_patch" => "Edit",
        "write_file" | "create_file" => "Write",
        "read_file" | "view_image" => "Read",
        "grep_files" | "search" => "Grep",
        "list_dir" => "LS",
        "web_search" => "WebSearch",
        "fetch_url" | "web_fetch" => "WebFetch",
        "update_plan" => "TodoWrite",
        "spawn_agent" | "delegate" => "Agent",
        "request_user_input" => "AskUserQuestion",
        other => other,
    }
}

/// Objetivo legible de una llamada: comando de shell o archivo del parche.
fn tool_target(name: &str, args: &Value) -> Option<String> {
    let s = match name {
        "Bash" => match &args["command"] {
            Value::Array(parts) => {
                let parts: Vec<&str> = parts.iter().filter_map(|p| p.as_str()).collect();
                // `bash -lc "<cmd>"`: el comando real es el último argumento.
                if parts.len() >= 3 && parts[1].starts_with('-') && parts[1].contains('c') {
                    parts[2].to_string()
                } else {
                    parts.join(" ")
                }
            }
            Value::String(s) => s.clone(),
            _ => args["cmd"].as_str().unwrap_or("").to_string(),
        },
        "Edit" => {
            let patch = args["input"]
                .as_str()
                .or(args["patch"].as_str())
                .unwrap_or("");
            patch
                .lines()
                .find_map(|l| {
                    l.strip_prefix("*** Update File: ")
                        .or(l.strip_prefix("*** Add File: "))
                        .or(l.strip_prefix("*** Delete File: "))
                })
                .unwrap_or("")
                .to_string()
        }
        _ => [
            "path",
            "file_path",
            "pattern",
            "query",
            "url",
            "description",
        ]
        .iter()
        .find_map(|k| args[*k].as_str())
        .unwrap_or("")
        .to_string(),
    };
    (!s.is_empty()).then(|| s.chars().take(500).collect())
}

/// Duración `{"secs", "nanos"}` de un item, en ms.
fn duration_ms(d: &Value) -> Option<i64> {
    let secs = d["secs"].as_i64()?;
    Some(secs * 1000 + d["nanos"].as_i64().unwrap_or(0) / 1_000_000)
}

/// Una herramienta sacada de un `item_completed` (formato nuevo de Codex).
struct ItemTool {
    call_id: String,
    tool: String,
    target: Option<String>,
    detail: Option<String>,
    is_error: bool,
    duration_ms: Option<i64>,
}

/// Herramientas de un `item_completed`. Un `FileChange` da una por archivo.
fn item_tools(it: &Value) -> Vec<ItemTool> {
    let t = |call_id: String,
             tool: &str,
             target: Option<String>,
             detail: Option<String>,
             is_error: bool,
             duration_ms: Option<i64>| ItemTool {
        call_id,
        tool: tool.to_string(),
        target,
        detail,
        is_error,
        duration_ms,
    };
    let id = it["id"].as_str().unwrap_or("").to_string();
    let status = it["status"].as_str().unwrap_or("");
    let failed = matches!(status, "failed" | "declined");
    let dur = duration_ms(&it["duration"]);
    match it["type"].as_str() {
        // `source` es `unified_exec_startup` también en los comandos del modelo: cuentan todos.
        Some("CommandExecution") => {
            let target = tool_target("Bash", &serde_json::json!({ "command": it["command"] }));
            let err = failed || it["exit_code"].as_i64().is_some_and(|c| c != 0);
            vec![t(id, "Bash", target, None, err, dur)]
        }
        Some("FileChange") => {
            let mut files: Vec<(&String, &Value)> = it["changes"]
                .as_object()
                .map(|m| m.iter().collect())
                .unwrap_or_default();
            files.sort_by(|a, b| a.0.cmp(b.0));
            files
                .into_iter()
                .enumerate()
                .map(|(i, (path, change))| {
                    let tool = match change["type"].as_str() {
                        Some("add") => "Write",
                        Some("delete") => "Delete",
                        _ => "Edit",
                    };
                    t(
                        format!("{id}:{i}"),
                        tool,
                        Some(path.chars().take(500).collect()),
                        None,
                        failed,
                        None,
                    )
                })
                .collect()
        }
        Some("McpToolCall") => {
            let (server, tool) = (
                it["server"].as_str().unwrap_or("mcp"),
                it["tool"].as_str().unwrap_or("tool"),
            );
            let err = failed || !it["error"].is_null();
            vec![t(
                id,
                &format!("mcp__{server}__{tool}"),
                None,
                None,
                err,
                dur,
            )]
        }
        Some("WebSearch") => vec![t(
            id,
            "WebSearch",
            it["query"].as_str().map(str::to_string),
            None,
            false,
            None,
        )],
        Some("Extension") if it["kind"].as_str() == Some("web.search") => {
            let open = it["action"]["type"].as_str() == Some("openPage");
            let (tool, target) = if open {
                (
                    "WebFetch",
                    it["action"]["url"].as_str().or(it["query"].as_str()),
                )
            } else {
                ("WebSearch", it["query"].as_str())
            };
            vec![t(id, tool, target.map(str::to_string), None, false, None)]
        }
        Some("CollabAgentToolCall") if it["tool"].as_str().is_some_and(|t| t.contains("spawn")) => {
            let detail = it["receiver_agents"][0]["role"]
                .as_str()
                .or(it["model"].as_str())
                .unwrap_or("general-purpose");
            vec![t(
                id,
                "Agent",
                it["prompt"].as_str().map(|p| p.chars().take(200).collect()),
                Some(detail.to_string()),
                failed,
                None,
            )]
        }
        _ => vec![],
    }
}

/// Texto de un `UserMessage` del formato nuevo.
fn item_text(it: &Value) -> String {
    it["content"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|c| c["text"].as_str())
        .collect::<Vec<_>>()
        .join("\n")
}

/// `function_call_output.output` es texto o `{"content","success"}`; el texto antiguo de shell
/// es un JSON con `metadata.exit_code`.
fn output_is_error(output: &Value) -> bool {
    if let Some(ok) = output["success"].as_bool() {
        return !ok;
    }
    if let Some(text) = output.as_str() {
        if let Ok(v) = serde_json::from_str::<Value>(text) {
            if let Some(code) = v["metadata"]["exit_code"].as_i64() {
                return code != 0;
            }
        }
    }
    false
}

impl Provider for Codex {
    fn id(&self) -> &'static str {
        "codex"
    }

    fn name(&self) -> &'static str {
        "Codex CLI"
    }

    fn log_roots(&self) -> Vec<PathBuf> {
        if let Some(r) = &self.roots {
            return r.clone();
        }
        Self::home()
            .map(|h| vec![h.join("sessions"), h.join("archived_sessions")])
            .unwrap_or_default()
    }

    fn installed(&self) -> bool {
        Self::home().is_some_and(|h| h.is_dir()) || super::on_path("codex")
    }

    fn matches(&self, path: &Path) -> bool {
        path.extension().is_some_and(|e| e == "jsonl")
            && path
                .file_name()
                .and_then(|f| f.to_str())
                .is_some_and(|f| f.starts_with("rollout-"))
            && self.log_roots().iter().any(|r| path.starts_with(r))
    }

    fn knows(&self, path: &Path) -> bool {
        self.state.lock().is_ok_and(|s| s.contains_key(path))
    }

    fn reset(&self, path: &Path) {
        self.state
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(path);
    }

    fn parse_line(&self, path: &Path, line: &str) -> Result<Vec<Record>> {
        let v: Value = serde_json::from_str(line)?;
        let Some(ts) = v["timestamp"].as_str().and_then(parse_ts) else {
            return Ok(vec![]);
        };
        let mut states = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let st = states.entry(path.to_path_buf()).or_default();
        let payload = &v["payload"];
        let mut out = Vec::new();

        match v["type"].as_str() {
            Some("session_meta") => {
                st.thread_id = payload["id"]
                    .as_str()
                    .or(payload["session_id"].as_str())
                    .unwrap_or("")
                    .to_string();
                st.cwd = payload["cwd"].as_str().map(str::to_string);
                st.branch = payload["git"]["branch"].as_str().map(str::to_string);
                st.is_subagent = payload["parent_thread_id"].is_string()
                    || payload["thread_source"].as_str() == Some("subagent")
                    || payload["source"].get("sub_agent").is_some();
            }
            Some("turn_context") => {
                if let Some(m) = payload["model"].as_str() {
                    st.model = m.to_string();
                }
                if let Some(c) = payload["cwd"].as_str() {
                    st.cwd = Some(c.to_string());
                }
                let id = payload["turn_id"]
                    .as_str()
                    .map(str::to_string)
                    .unwrap_or_else(|| format!("{}:{ts}", st.thread_id));
                st.turn_id = Some(id.clone());
                if !st.is_subagent && !st.thread_id.is_empty() {
                    out.push(Record::Turn(TurnRec {
                        id,
                        session_id: st.thread_id.clone(),
                        ts,
                        intent: st.pending_prompt.take().as_deref().and_then(prompt_intent),
                    }));
                }
            }
            Some("token_usage_record") => {
                st.has_usage_records = true;
                push_call(
                    &mut out,
                    st,
                    payload["response_id"].as_str().unwrap_or("").to_string(),
                    &payload["usage"],
                    ts,
                );
            }
            Some("event_msg") => match payload["type"].as_str() {
                Some("user_message") | Some("item_completed")
                    if payload["type"].as_str() == Some("user_message")
                        || payload["item"]["type"].as_str() == Some("UserMessage") =>
                {
                    if payload["type"].as_str() == Some("item_completed") {
                        st.has_items = true;
                    }
                    let text = if payload["type"].as_str() == Some("user_message") {
                        payload["message"].as_str().unwrap_or("").to_string()
                    } else {
                        item_text(&payload["item"])
                    };
                    match &st.turn_id {
                        // El prompt llega tras su turn_context: completa la intención del turno.
                        Some(turn) if !st.is_subagent => out.push(Record::Turn(TurnRec {
                            id: turn.clone(),
                            session_id: st.thread_id.clone(),
                            ts,
                            intent: prompt_intent(&text),
                        })),
                        _ => st.pending_prompt = Some(text),
                    }
                }
                Some("token_count") if !st.has_usage_records => {
                    let usage = &payload["info"]["last_token_usage"];
                    if usage.is_object() {
                        let id = format!("tc:{}:{ts}", st.thread_id);
                        push_call(&mut out, st, id, usage, ts);
                    }
                }
                Some("item_completed") => {
                    st.has_items = true;
                    let it = &payload["item"];
                    if it["type"].as_str() == Some("ContextCompaction") {
                        out.push(Record::Event(EventRec {
                            session_id: st.thread_id.clone(),
                            ts,
                            kind: "compaction".into(),
                            payload_json: None,
                        }));
                    }
                    for ItemTool {
                        call_id,
                        tool,
                        target,
                        detail,
                        is_error,
                        duration_ms: dur,
                    } in item_tools(it)
                    {
                        // El item llega al terminar: la herramienta empezó `dur` antes.
                        let start = ts - dur.unwrap_or(0);
                        out.push(Record::ToolUse(ToolUseRec {
                            call_id: call_id.clone(),
                            message_id: st.turn_id.clone().unwrap_or_default(),
                            session_id: st.thread_id.clone(),
                            ts: start,
                            tool,
                            target,
                            detail,
                        }));
                        out.push(Record::ToolResult {
                            call_id,
                            ts,
                            is_error,
                            agent_id: None,
                        });
                    }
                }
                Some("turn_aborted") => out.push(Record::Event(EventRec {
                    session_id: st.thread_id.clone(),
                    ts,
                    kind: "interruption".into(),
                    payload_json: None,
                })),
                _ => {}
            },
            Some("compacted") => out.push(Record::Event(EventRec {
                session_id: st.thread_id.clone(),
                ts,
                kind: "compaction".into(),
                payload_json: None,
            })),
            Some("response_item") => match payload["type"].as_str() {
                // Formato nuevo: las herramientas salen de `item_completed`, y `exec` es solo la
                // envoltura del modo código (el JavaScript que llama a las herramientas reales).
                Some("function_call") | Some("custom_tool_call") | Some("local_shell_call")
                    if !st.has_items && payload["name"].as_str() != Some("exec") =>
                {
                    let raw = payload["name"].as_str().unwrap_or("local_shell");
                    let namespace = payload["namespace"].as_str().filter(|n| *n != "functions");
                    let tool = match namespace {
                        Some(ns) => format!("mcp__{ns}__{raw}"),
                        None => canonical_tool(raw).to_string(),
                    };
                    let args: Value = match payload["type"].as_str() {
                        Some("local_shell_call") => payload["action"].clone(),
                        Some("custom_tool_call") => {
                            serde_json::json!({ "input": payload["input"] })
                        }
                        _ => payload["arguments"]
                            .as_str()
                            .and_then(|a| serde_json::from_str(a).ok())
                            .unwrap_or(Value::Null),
                    };
                    let detail = (tool == "Agent").then(|| {
                        args["agent_type"]
                            .as_str()
                            .or(args["role"].as_str())
                            .or(args["name"].as_str())
                            .unwrap_or("general-purpose")
                            .to_string()
                    });
                    let Some(call_id) = payload["call_id"].as_str().or(payload["id"].as_str())
                    else {
                        return Ok(out);
                    };
                    out.push(Record::ToolUse(ToolUseRec {
                        call_id: call_id.to_string(),
                        message_id: st.turn_id.clone().unwrap_or_default(),
                        session_id: st.thread_id.clone(),
                        ts,
                        target: tool_target(&tool, &args),
                        tool,
                        detail,
                    }));
                }
                Some("function_call_output") | Some("custom_tool_call_output") => {
                    if let Some(call_id) = payload["call_id"].as_str() {
                        out.push(Record::ToolResult {
                            call_id: call_id.to_string(),
                            ts,
                            is_error: output_is_error(&payload["output"]),
                            agent_id: None,
                        });
                    }
                }
                _ => {}
            },
            _ => {}
        }

        if !out.is_empty() && !st.thread_id.is_empty() {
            out.insert(
                0,
                Record::Session(SessionRec {
                    id: st.thread_id.clone(),
                    cwd: st.cwd.clone(),
                    git_branch: st.branch.clone(),
                    ts,
                    is_subagent: st.is_subagent,
                }),
            );
        }
        Ok(out)
    }
}

fn push_call(out: &mut Vec<Record>, st: &FileState, message_id: String, usage: &Value, ts: i64) {
    if st.thread_id.is_empty() || message_id.is_empty() {
        return;
    }
    let n = |k: &str| usage[k].as_i64().unwrap_or(0);
    // `input_tokens` de Codex incluye los tokens leídos de caché.
    let cached = n("cached_input_tokens");
    out.push(Record::Call(CallRec {
        message_id,
        session_id: st.thread_id.clone(),
        ts,
        model: crate::pricing::normalize_model(&st.model),
        input_tokens: (n("input_tokens") - cached).max(0),
        output_tokens: n("output_tokens"),
        cache_read: cached,
        cache_write: n("cache_write_input_tokens"),
        cache_write_1h: 0,
        reasoning_tokens: n("reasoning_output_tokens"),
        activity: None,
        is_sidechain: st.is_subagent,
        agent_id: st.is_subagent.then(|| st.thread_id.clone()),
        cost_reported: None,
    }));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn objetivo_de_shell_y_parche() {
        let args =
            serde_json::json!({ "command": ["bash", "-lc", "git status | head"], "workdir": "/p" });
        assert_eq!(
            tool_target("Bash", &args).as_deref(),
            Some("git status | head")
        );
        let args = serde_json::json!({ "command": ["ls", "-la"] });
        assert_eq!(tool_target("Bash", &args).as_deref(), Some("ls -la"));
        let patch = serde_json::json!({ "input": "*** Begin Patch\n*** Update File: src/lib.rs\n@@\n-a\n+b\n*** End Patch" });
        assert_eq!(tool_target("Edit", &patch).as_deref(), Some("src/lib.rs"));
    }

    #[test]
    fn error_en_la_salida() {
        assert!(output_is_error(
            &serde_json::json!({ "content": "x", "success": false })
        ));
        assert!(!output_is_error(
            &serde_json::json!({ "content": "x", "success": true })
        ));
        assert!(output_is_error(&Value::String(
            r#"{"output":"boom","metadata":{"exit_code":1,"duration_seconds":0.1}}"#.into()
        )));
        assert!(!output_is_error(&Value::String("todo bien".into())));
    }

    #[test]
    fn detecta_rollouts() {
        let p = Codex::with_roots(vec![PathBuf::from("/h/.codex/sessions")]);
        assert!(p.matches(Path::new(
            "/h/.codex/sessions/2026/09/25/rollout-2026-09-25T10-00-00-abc.jsonl"
        )));
        assert!(!p.matches(Path::new("/h/.codex/sessions/2026/09/25/otro.jsonl")));
        assert!(!p.matches(Path::new("/h/.codex/history.jsonl")));
    }

    #[test]
    fn formato_nuevo_con_item_completed() {
        let p = Codex::with_roots(vec![PathBuf::from("/h/.codex/sessions")]);
        let f = PathBuf::from("/h/.codex/sessions/2026/09/27/rollout-x.jsonl");
        let lines = [
            r#"{"timestamp":"2026-09-27T16:00:00.000Z","type":"session_meta","payload":{"id":"t1","cwd":"/w","git":{"branch":"feat/v2"}}}"#,
            r#"{"timestamp":"2026-09-27T16:00:01.000Z","type":"turn_context","payload":{"turn_id":"tu1","model":"gpt-6-astra","cwd":"/w"}}"#,
            r#"{"timestamp":"2026-09-27T16:00:02.000Z","type":"event_msg","payload":{"type":"item_completed","item":{"type":"UserMessage","id":"u1","content":[{"type":"text","text":"arregla el test que falla"}]}}}"#,
            // Envoltura del modo código: no es una herramienta.
            r#"{"timestamp":"2026-09-27T16:00:03.000Z","type":"response_item","payload":{"type":"custom_tool_call","name":"exec","call_id":"c1","input":"await tools.shell('ls')"}}"#,
            r#"{"timestamp":"2026-09-27T16:00:05.000Z","type":"event_msg","payload":{"type":"item_completed","item":{"type":"CommandExecution","id":"e1","command":["/bin/zsh","-lc","cargo test --lib"],"source":"unified_exec_startup","status":"failed","exit_code":101,"duration":{"secs":2,"nanos":500000000}}}}"#,
            r#"{"timestamp":"2026-09-27T16:00:06.000Z","type":"event_msg","payload":{"type":"item_completed","item":{"type":"FileChange","id":"f1","changes":{"/w/a.rs":{"type":"update"},"/w/b.rs":{"type":"add"}},"status":"completed"}}}"#,
            r#"{"timestamp":"2026-09-27T16:00:07.000Z","type":"event_msg","payload":{"type":"item_completed","item":{"type":"McpToolCall","id":"m1","server":"agentboard","tool":"get_summary","arguments":{},"status":"failed","error":{"message":"x"},"duration":{"secs":0,"nanos":180000000}}}}"#,
            r#"{"timestamp":"2026-09-27T16:00:08.000Z","type":"event_msg","payload":{"type":"item_completed","item":{"type":"Extension","kind":"web.search","id":"w1","query":"https://example.com","action":{"type":"openPage","url":"https://example.com"}}}}"#,
            r#"{"timestamp":"2026-09-27T16:00:09.000Z","type":"event_msg","payload":{"type":"item_completed","item":{"type":"ContextCompaction","id":"cc1"}}}"#,
        ];
        let recs: Vec<Record> = lines
            .iter()
            .flat_map(|l| p.parse_line(&f, l).unwrap())
            .collect();
        let tools: Vec<(&str, Option<&str>)> = recs
            .iter()
            .filter_map(|r| match r {
                Record::ToolUse(t) => Some((t.tool.as_str(), t.target.as_deref())),
                _ => None,
            })
            .collect();
        assert_eq!(
            tools,
            vec![
                ("Bash", Some("cargo test --lib")),
                ("Edit", Some("/w/a.rs")),
                ("Write", Some("/w/b.rs")),
                ("mcp__agentboard__get_summary", None),
                ("WebFetch", Some("https://example.com")),
            ],
            "sin la envoltura exec"
        );
        let errors: Vec<bool> = recs
            .iter()
            .filter_map(|r| match r {
                Record::ToolResult { is_error, .. } => Some(*is_error),
                _ => None,
            })
            .collect();
        assert_eq!(
            errors,
            vec![true, false, false, true, false],
            "cargo y el MCP fallaron"
        );
        // El comando duró 2,5 s: empieza 2,5 s antes de su item.
        let bash = recs.iter().find_map(|r| match r {
            Record::ToolUse(t) if t.tool == "Bash" => Some(t.ts),
            _ => None,
        });
        assert_eq!(
            bash,
            Some(crate::providers::parse_ts("2026-09-27T16:00:02.500Z").unwrap())
        );
        assert!(recs
            .iter()
            .any(|r| matches!(r, Record::Event(e) if e.kind == "compaction")));
        // El prompt del UserMessage da la intención del turno.
        assert!(recs
            .iter()
            .any(|r| matches!(r, Record::Turn(t) if t.intent == Some("debug"))));
    }
}
