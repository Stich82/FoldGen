package main

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"foldgen/backend"
)

// App holds application state and exposes methods to the frontend via Wails bindings.
type App struct {
	ctx   context.Context
	dirty bool
}

func NewApp() *App {
	return &App{}
}

func (a *App) OnStartup(ctx context.Context) {
	a.ctx = ctx
}

// OnSecondInstanceLaunch is invoked (on the already-running instance) when the
// user tries to open a second instance. Instead of starting a new process we
// bring the existing window to the front — this prevents multiple windows
// editing the same templates at once.
func (a *App) OnSecondInstanceLaunch(_ options.SecondInstanceData) {
	runtime.WindowUnminimise(a.ctx)
	runtime.Show(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)
}

// SetDirty lets the frontend report whether there are unsaved changes.
func (a *App) SetDirty(d bool) {
	a.dirty = d
}

// OnBeforeClose runs when the user tries to close the window. If there are
// unsaved changes it asks the frontend to confirm and prevents the close.
func (a *App) OnBeforeClose(ctx context.Context) bool {
	if a.dirty {
		runtime.EventsEmit(ctx, "app:beforeclose")
		return true // prevent close; frontend decides what to do
	}
	return false
}

// QuitApp is called by the frontend once the user confirms closing.
func (a *App) QuitApp() {
	a.dirty = false
	runtime.Quit(a.ctx)
}

// ─── Settings ────────────────────────────────────────────────────────────────

func (a *App) GetSettings() backend.Settings {
	return backend.LoadSettings()
}

func (a *App) SaveSettings(s backend.Settings) error {
	return backend.SaveSettings(s)
}

// ─── Templates ───────────────────────────────────────────────────────────────

func (a *App) GetTemplates() ([]backend.Template, error) {
	return backend.LoadTemplates()
}

func (a *App) SaveTemplate(name string, tree []backend.Node) error {
	return backend.SaveTemplate(name, tree)
}

func (a *App) DeleteTemplate(name string) error {
	return backend.DeleteTemplate(name)
}

func (a *App) RenameTemplate(oldName, newName string) error {
	return backend.RenameTemplate(oldName, newName)
}

func (a *App) DuplicateTemplate(name string) (backend.Template, error) {
	return backend.DuplicateTemplate(name)
}

func (a *App) ImportTemplate(path string) (backend.Template, error) {
	return backend.ImportTemplate(path)
}

func (a *App) ExportTemplate(name string, destPath string, tree []backend.Node) error {
	return backend.ExportTemplate(name, destPath, tree)
}

// ─── Filesystem Scan ─────────────────────────────────────────────────────────

func (a *App) ScanFolder(path string, includeHidden bool, maxDepth int) ([]backend.Node, error) {
	return backend.ScanFolder(path, includeHidden, maxDepth)
}

// ─── Generation ──────────────────────────────────────────────────────────────

func (a *App) CreateFolders(projectName, outputPath string, tree []backend.Node) error {
	if ok, reason := backend.ValidateName(projectName); !ok {
		return fmt.Errorf("nome progetto non valido '%s': %s", projectName, reason)
	}
	if err := backend.ValidateTree(tree, 0); err != nil {
		return err
	}
	target := filepath.Join(outputPath, projectName)
	return backend.CreateStructure(target, tree)
}

func (a *App) GenerateBat(projectName, outputPath string, tree []backend.Node) (string, error) {
	if ok, reason := backend.ValidateName(projectName); !ok {
		return "", fmt.Errorf("nome progetto non valido '%s': %s", projectName, reason)
	}
	if err := backend.ValidateTree(tree, 0); err != nil {
		return "", err
	}
	return backend.GenerateBat(projectName, outputPath, tree)
}

func (a *App) GenerateSh(projectName, outputPath string, tree []backend.Node) (string, error) {
	if ok, reason := backend.ValidateName(projectName); !ok {
		return "", fmt.Errorf("nome progetto non valido '%s': %s", projectName, reason)
	}
	if err := backend.ValidateTree(tree, 0); err != nil {
		return "", err
	}
	return backend.GenerateSh(projectName, outputPath, tree)
}

// ─── Validation ──────────────────────────────────────────────────────────────

func (a *App) ValidateName(name string) (bool, string) {
	return backend.ValidateName(name)
}

func (a *App) ValidateTree(tree []backend.Node) error {
	return backend.ValidateTree(tree, 0)
}

// ─── Native Dialogs ──────────────────────────────────────────────────────────

func (a *App) OpenFolderDialog() (string, error) {
	return backend.OpenFolderDialog(a.ctx)
}

func (a *App) OpenFileDialog() (string, error) {
	return backend.OpenFileDialog(a.ctx)
}

func (a *App) SaveFileDialog(defaultName string) (string, error) {
	return backend.SaveFileDialog(a.ctx, defaultName)
}
