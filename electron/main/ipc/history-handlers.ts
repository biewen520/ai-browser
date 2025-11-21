import { ipcMain, WebContentsView } from "electron";
import { windowContextManager } from "../services/window-context-manager";
import { taskWindowManager } from "../services/task-window-manager";

// Track ongoing screenshot loads to prevent race conditions
const ongoingScreenshotLoads = new Map<number, Promise<any>>();

/**
 * Register all history related IPC handlers
 * Handles history view display and task history window management
 * All handlers support window isolation through windowContextManager
 */
export function registerHistoryHandlers() {
  // Show history view with screenshot
  ipcMain.handle('show-history-view', async (event, screenshot: string) => {
    const senderId = event.sender.id;

    // Check if there's already an ongoing load for this sender
    const ongoingLoad = ongoingScreenshotLoads.get(senderId);
    if (ongoingLoad) {
      console.log('[show-history-view] Request already in progress, waiting for completion');
      try {
        await ongoingLoad;
      } catch (error) {
        // Ignore errors from previous load
      }
    }

    // Create a new load promise
    const loadPromise = (async () => {
      try {
        console.log('[show-history-view] Received screenshot, length:', screenshot.length);
        const context = windowContextManager.getContext(senderId);
        if (!context) {
          throw new Error('Window context not found');
        }

        // Create history view if not exists
        if (context.historyView) {
          context.window.contentView.removeChildView(context.historyView);
          context.historyView = null;
        }

        context.historyView = new WebContentsView();

      // Load a simple HTML template first (without the large screenshot data)
      const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        overflow: hidden;
      }
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <img id="screenshot" alt="Historical screenshot" />
  </body>
</html>`;

      // Load the template
      await context.historyView.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlTemplate)}`);

      // Wait for DOM to be ready
      await context.historyView.webContents.executeJavaScript('document.readyState === "complete"');

      // Set the screenshot via JavaScript (avoid URL length limits)
      await context.historyView.webContents.executeJavaScript(`
        document.getElementById('screenshot').src = ${JSON.stringify(screenshot)};
      `);

      // Set history view position (overlay detail panel position)
      context.window.contentView.addChildView(context.historyView);
      context.historyView.setBounds({
        x: 818,
        y: 264,
        width: 748,
        height: 560,
      });

        console.log('[show-history-view] Completed successfully');
        return { success: true };
      } catch (error: any) {
        console.error('[show-history-view] Error:', error);
        throw error;
      }
    })();

    // Store the ongoing load promise
    ongoingScreenshotLoads.set(senderId, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      // Clean up after completion
      ongoingScreenshotLoads.delete(senderId);
    }
  });

  // Hide history view
  ipcMain.handle('hide-history-view', async (event) => {
    const senderId = event.sender.id;

    try {
      console.log('[hide-history-view] Received request');

      // Clear any ongoing screenshot load
      ongoingScreenshotLoads.delete(senderId);

      const context = windowContextManager.getContext(senderId);
      if (context && context.historyView) {
        context.window.contentView.removeChildView(context.historyView);
        context.historyView = null;
        console.log('[hide-history-view] History view removed');
      }
      return { success: true };
    } catch (error: any) {
      console.error('[hide-history-view] Error:', error);
      throw error;
    }
  });

  // Open task history window
  ipcMain.handle('open-task-history', async (_event, taskId: string) => {
    try {
      console.log('[IPC] open-task-history received:', taskId);

      // Check if task window already exists
      let taskWindow = taskWindowManager.getTaskWindow(taskId);

      if (taskWindow) {
        // Window exists, activate it
        console.log('[IPC] Task window exists, activating window');
        taskWindow.window.show();
        taskWindow.window.focus();
      } else {
        // Window doesn't exist, create new window
        console.log('[IPC] Task window does not exist, creating new window');

        // Generate new executionId (for creating window, won't execute task immediately)
        const executionId = `view_history_${Date.now()}`;

        // Create task window
        taskWindow = await taskWindowManager.createTaskWindow(taskId, executionId);
      }

      // Wait for window content to load, then send open history panel event
      setTimeout(() => {
        taskWindow!.window.webContents.send('open-history-panel', { taskId });
        console.log('[IPC] Sent open-history-panel event to task window');
      }, 1000); // Delay 1 second to ensure page is loaded

      return { success: true };
    } catch (error: any) {
      console.error('[IPC] open-task-history error:', error);
      throw error;
    }
  });

  console.log('[IPC] History handlers registered');
}
