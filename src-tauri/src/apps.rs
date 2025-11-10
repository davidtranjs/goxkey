use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
#[cfg(target_os = "macos")]
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub identifier: String,
    pub name: String,
    pub path: String,
}

static APP_CACHE: OnceCell<Vec<AppInfo>> = OnceCell::new();

pub fn search_apps(query: Option<&str>) -> Vec<AppInfo> {
    let apps = APP_CACHE.get_or_init(discover_apps);
    let normalized = query
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty());
    match normalized {
        Some(term) => apps
            .iter()
            .filter(|app| {
                let name = app.name.to_lowercase();
                let identifier = app.identifier.to_lowercase();
                name.contains(&term) || identifier.contains(&term)
            })
            .take(20)
            .cloned()
            .collect(),
        None => apps.iter().take(20).cloned().collect(),
    }
}

fn discover_apps() -> Vec<AppInfo> {
    discover_apps_impl()
}

#[cfg(target_os = "macos")]
fn discover_apps_impl() -> Vec<AppInfo> {
    use std::collections::HashSet;
    use walkdir::WalkDir;

    let mut results = Vec::new();
    let mut seen = HashSet::new();
    for dir in candidate_dirs() {
        if !dir.exists() {
            continue;
        }
        for entry in WalkDir::new(&dir)
            .max_depth(3)
            .follow_links(false)
            .into_iter()
            .filter_map(Result::ok)
        {
            if !entry.file_type().is_dir() {
                continue;
            }
            let path = entry.path();
            let is_app_bundle = path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("app"))
                .unwrap_or(false);
            if !is_app_bundle {
                continue;
            }
            if let Some(info) = read_app_bundle(path) {
                if seen.insert(info.path.clone()) {
                    results.push(info);
                }
            }
        }
    }
    results.sort_by(|a, b| {
        let left = a.name.to_lowercase();
        let right = b.name.to_lowercase();
        left.cmp(&right).then_with(|| a.identifier.cmp(&b.identifier))
    });
    results
}

#[cfg(target_os = "macos")]
fn candidate_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/System/Applications/Utilities"),
        PathBuf::from("/System/Library/CoreServices"),
    ];
    if let Some(home) = crate::platform::get_home_dir() {
        dirs.push(home.join("Applications"));
    }
    dirs
}

#[cfg(target_os = "macos")]
fn read_app_bundle(path: &std::path::Path) -> Option<AppInfo> {
    use plist::Value;
    use std::fs;
    use std::io::Cursor;

    let info_path = path.join("Contents").join("Info.plist");
    let data = fs::read(info_path).ok()?;
    let value = Value::from_reader(Cursor::new(data)).ok()?;
    let dict = value.into_dictionary()?;
    let identifier = dict
        .get("CFBundleIdentifier")
        .and_then(|v| v.as_string())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    let name = dict
        .get("CFBundleDisplayName")
        .and_then(|v| v.as_string())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            dict.get("CFBundleName")
                .and_then(|v| v.as_string())
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty())
        })
        .unwrap_or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("App")
                .to_string()
        });
    Some(AppInfo {
        identifier,
        name,
        path: path.to_string_lossy().to_string(),
    })
}

#[cfg(not(target_os = "macos"))]
fn discover_apps_impl() -> Vec<AppInfo> {
    Vec::new()
}
