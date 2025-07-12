# Exclude Apps Feature - Enhanced Version

## Overview
The enhanced "Exclude apps" feature allows users to specify applications that should be excluded from Vietnamese input mode by selecting from a list of currently running applications. This eliminates the need to manually type application names and prevents typos.

## New Implementation Details

### Platform Integration
- **macOS**: Uses `NSWorkspace.runningApplications` to get all running applications
- **Linux/Windows**: Placeholder implementations (to be completed)

### Key Components

#### 1. Platform Layer (`src/platform/`)
- **New Function**: `get_running_applications() -> Vec<String>`
  - **macOS**: Returns clean app names (e.g., "Safari", "Chrome", "Xcode")
  - **Linux/Windows**: Returns placeholder for now

#### 2. UI Enhancements (`src/ui.rs`)
- **New UI Fields**:
  - `running_apps: Arc<Vec<String>>` - List of running applications
  - `selected_app_index: usize` - Currently selected app index
  - Removed `new_excluded_app: String` (no longer needed)

- **New Commands**:
  - `ADD_EXCLUDED_APP_BY_NAME` - Add app by name directly
  - `REFRESH_RUNNING_APPS` - Refresh the running apps list

#### 3. Enhanced UI Components
- **Excluded Apps Manager Window** now features:
  - **Upper section**: List of currently excluded apps (with delete buttons)
  - **Middle section**: "Refresh" button to update running apps list
  - **Lower section**: List of running applications with "Add" buttons
  - **Helper text**: Clear instructions for users

### How Users Will Use It

1. **Enable the Feature**: 
   - Check "Loại trừ ứng dụng" (Exclude apps) in main settings

2. **Open Management Window**:
   - Click "Quản lý ứng dụng loại trừ" (Manage excluded apps)

3. **Add Applications**:
   - Click "Làm mới" (Refresh) to update the running apps list
   - Browse the list of currently running applications
   - Click "Thêm" (Add) next to any app you want to exclude

4. **Remove Applications**:
   - Click "Xóa" (Delete) next to any app in the excluded list

5. **Refresh When Needed**:
   - Click "Làm mới" (Refresh) if you've opened new apps and want to add them

### Technical Benefits

1. **User-Friendly**: No more typing app names or worrying about exact spelling
2. **Real-Time**: Shows only currently running applications
3. **Accurate**: Uses system APIs to get exact app names
4. **Refreshable**: Users can update the list when new apps are opened
5. **Clean Names**: Automatically extracts readable app names (removes .app extension, paths, etc.)

### Implementation Status

#### ✅ Completed
- Configuration storage for excluded apps
- UI for managing excluded applications
- macOS implementation for getting running apps
- Command handling for adding/removing apps
- Real-time refresh functionality

#### 🔄 Platform-Specific Implementation
- **macOS**: ✅ Fully implemented
- **Linux**: ⏳ Placeholder (needs proper process enumeration)
- **Windows**: ⏳ Placeholder (needs proper process enumeration)

#### 🎯 Future Enhancements
- Search/filter functionality for large app lists
- App icons display
- Categorization of system vs user apps
- Batch add/remove operations

### Code Structure

```rust
// Platform layer
pub fn get_running_applications() -> Vec<String> {
    // Returns cleaned app names from system
}

// UI layer
struct UIDataAdapter {
    running_apps: Arc<Vec<String>>,        // Current running apps
    excluded_apps: Arc<Vec<String>>,       // Apps to exclude
    selected_app_index: usize,             // UI selection state
    // ... other fields
}

// Commands
ADD_EXCLUDED_APP_BY_NAME: Selector<String>  // Add by app name
REFRESH_RUNNING_APPS: Selector              // Refresh running apps
```

### User Experience Flow

1. **Initial State**: Running apps list is populated on window open
2. **Selection**: User browses currently running applications
3. **Addition**: Single click to add any running app to exclusion list
4. **Refresh**: Manual refresh when new apps are opened
5. **Management**: Easy removal of excluded apps
6. **Persistence**: All changes saved automatically

This enhanced version significantly improves usability by eliminating manual typing and providing a visual interface for app selection.