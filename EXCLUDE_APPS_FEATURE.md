# Exclude Apps Feature Implementation

## Overview
The "Exclude apps" feature allows users to specify applications that should be excluded from Vietnamese input mode. When Vietnamese mode is enabled and the exclude apps feature is active, excluded applications will continue to use English input mode.

## Key Components

### 1. Configuration Layer (`src/config.rs`)

#### New Fields Added:
- `excluded_apps: Vec<String>` - List of excluded application names
- `is_exclude_apps_enabled: bool` - Toggle for the exclude apps feature

#### New Configuration Keys:
- `EXCLUDED_APPS_CONFIG_KEY: "excluded-apps"` - Config key for excluded apps list
- `EXCLUDE_APPS_ENABLED_CONFIG_KEY: "is_exclude_apps_enabled"` - Config key for feature toggle

#### New Methods:
- `is_excluded_app(app_name: &str) -> bool` - Check if an app is excluded
- `add_excluded_app(app_name: &str)` - Add an app to the exclusion list
- `remove_excluded_app(app_name: &str)` - Remove an app from the exclusion list
- `get_excluded_apps() -> &Vec<String>` - Get the list of excluded apps
- `is_exclude_apps_enabled() -> bool` - Check if the feature is enabled
- `set_exclude_apps_enabled(flag: bool)` - Enable/disable the feature

### 2. Input State Layer (`src/input.rs`)

#### New Field Added:
- `is_exclude_apps_enabled: bool` - Cache for exclude apps feature state

#### Modified `is_enabled()` Method:
The core logic now checks if:
1. The feature is enabled
2. Vietnamese mode is active
3. The current app is in the exclusion list

If all conditions are met, Vietnamese input is disabled for that app.

#### New Methods:
- `is_exclude_apps_enabled() -> bool`
- `toggle_exclude_apps_enabled()`
- `add_excluded_app(app_name: &str)`
- `remove_excluded_app(app_name: &str)`
- `get_excluded_apps() -> Vec<String>`
- `is_current_app_excluded() -> bool`

### 3. User Interface Layer (`src/ui.rs`)

#### New UI Data Fields:
- `is_exclude_apps_enabled: bool` - UI state for the feature toggle
- `excluded_apps: Arc<Vec<String>>` - List of excluded apps for UI display
- `new_excluded_app: String` - Input field for adding new excluded apps

#### New UI Commands:
- `ADD_EXCLUDED_APP` - Command to add an app to exclusion list
- `REMOVE_EXCLUDED_APP` - Command to remove an app from exclusion list

#### New UI Elements:
1. **Main Settings Window:**
   - Checkbox: "Loại trừ ứng dụng" (Exclude apps)
   - Button: "Quản lý ứng dụng loại trừ" (Manage excluded apps)

2. **Excluded Apps Manager Window:**
   - Scrollable list showing all excluded apps
   - Text input for adding new apps
   - Delete buttons for removing apps
   - Helper text with usage instructions

#### New UI Builder:
`excluded_apps_editor_ui_builder()` - Creates the dedicated window for managing excluded applications

## How It Works

1. **Feature Toggle:** Users can enable/disable the exclude apps feature via the main UI checkbox
2. **App Management:** Users can open the excluded apps manager to add/remove applications
3. **Input Logic:** When Vietnamese mode is enabled:
   - If exclude apps feature is disabled: Normal Vietnamese input for all apps
   - If exclude apps feature is enabled: Check if current app is excluded
     - If excluded: Force English input mode
     - If not excluded: Normal Vietnamese input
4. **Persistence:** All settings are saved to the configuration file automatically

## Usage Instructions

1. **Enable the Feature:**
   - Open the main gõkey settings window
   - Check the "Loại trừ ứng dụng" (Exclude apps) checkbox

2. **Add Excluded Apps:**
   - Click "Quản lý ứng dụng loại trừ" (Manage excluded apps)
   - Enter the exact application name in the text field
   - Click "Thêm" (Add) to add the app to the exclusion list

3. **Remove Excluded Apps:**
   - In the excluded apps manager window
   - Click "Xóa" (Delete) next to any app you want to remove

4. **Behavior:**
   - When Vietnamese mode is enabled and exclude apps feature is active
   - Applications in the exclusion list will continue to use English input
   - All other applications will use Vietnamese input as normal

## Technical Notes

- The feature integrates seamlessly with the existing auto-toggle functionality
- App names must match exactly as they appear in the system
- The exclusion check happens at the input processing level for optimal performance
- All configuration changes are automatically saved to the user's config file
- The UI provides real-time feedback and updates when apps are added/removed

## Files Modified

1. `src/config.rs` - Configuration management for excluded apps
2. `src/input.rs` - Input logic to handle app exclusions
3. `src/ui.rs` - User interface for managing the feature

This implementation provides a complete and user-friendly way to exclude specific applications from Vietnamese input mode while maintaining full compatibility with existing features.