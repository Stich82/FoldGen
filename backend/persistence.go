package backend

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// dataDir returns the per-user application data directory (e.g.
// ~/Library/Application Support/FoldGen on macOS, %AppData%\FoldGen on Windows,
// ~/.config/FoldGen on Linux). Falls back to the executable directory.
// This must be a writable location: storing data next to the executable breaks
// when the app is installed read-only (e.g. /Applications, Program Files).
func dataDir() string {
	// FOLDGEN_DATA_DIR overrides the data location (for tests/portability):
	// when set and non-empty it is used verbatim instead of os.UserConfigDir().
	if override := os.Getenv("FOLDGEN_DATA_DIR"); override != "" {
		_ = os.MkdirAll(override, 0o755)
		return override
	}
	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		base = os.TempDir()
	}
	dir := filepath.Join(base, "FoldGen")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		// Last-resort writable location.
		dir = filepath.Join(os.TempDir(), "FoldGen")
		_ = os.MkdirAll(dir, 0o755)
	}
	return dir
}

func templatesDir() string {
	dir := filepath.Join(dataDir(), "templates")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

func settingsPath() string {
	return filepath.Join(dataDir(), "settings.json")
}

// ─── Settings ────────────────────────────────────────────────────────────────

func LoadSettings() Settings {
	data, err := os.ReadFile(settingsPath())
	if err != nil {
		return DefaultSettings
	}
	var s Settings
	if err := json.Unmarshal(data, &s); err != nil {
		return DefaultSettings
	}
	// Fill missing keys with defaults
	if s.Accent == "" {
		s.Accent = DefaultSettings.Accent
	}
	if s.FontSize == 0 {
		s.FontSize = DefaultSettings.FontSize
	}
	if s.ScanMaxDepth == 0 {
		s.ScanMaxDepth = DefaultSettings.ScanMaxDepth
	}
	if s.ColorMode == "" {
		s.ColorMode = DefaultSettings.ColorMode
	}
	if len(s.Palette) == 0 {
		s.Palette = DefaultSettings.Palette
	}
	if s.DepthPrimary == "" {
		s.DepthPrimary = DefaultSettings.DepthPrimary
	}
	if s.SingleColor == "" {
		s.SingleColor = DefaultSettings.SingleColor
	}
	return s
}

func SaveSettings(s Settings) error {
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(settingsPath(), data, 0o644)
}

// ─── Templates ───────────────────────────────────────────────────────────────

func LoadTemplates() ([]Template, error) {
	dir := templatesDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var templates []Template
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		var tpl Template
		if err := json.Unmarshal(data, &tpl); err != nil {
			continue
		}
		if tpl.Name == "" {
			tpl.Name = strings.TrimSuffix(e.Name(), ".json")
		}
		templates = append(templates, tpl)
	}
	return templates, nil
}

func SaveTemplate(name string, tree []Node) error {
	if err := ValidateTree(tree, 0); err != nil {
		return err
	}
	tpl := Template{Name: name, Tree: tree}
	data, err := json.MarshalIndent(tpl, "", "  ")
	if err != nil {
		return err
	}
	filename := sanitizeFilename(name) + ".json"
	return os.WriteFile(filepath.Join(templatesDir(), filename), data, 0o644)
}

func DeleteTemplate(name string) error {
	filename := sanitizeFilename(name) + ".json"
	path := filepath.Join(templatesDir(), filename)
	err := os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

func RenameTemplate(oldName, newName string) error {
	newName = strings.TrimSpace(newName)
	templates, err := LoadTemplates()
	if err != nil {
		return err
	}
	var src *Template
	for i := range templates {
		if templates[i].Name == oldName {
			src = &templates[i]
			break
		}
	}
	if src == nil {
		return errors.New("template non trovato: " + oldName)
	}

	oldKey := templateNameKey(oldName)
	newKey := templateNameKey(newName)

	// Reject a collision with a *different* existing template (would overwrite
	// it on save). A name sharing oldName's key is the source itself — allowed.
	for i := range templates {
		if templates[i].Name == oldName {
			continue
		}
		if templateNameKey(templates[i].Name) == newKey {
			return errors.New("esiste già un template con questo nome: " + newName)
		}
	}

	// Write the new file first so a crash between the two ops leaves the old
	// file intact rather than losing the template entirely.
	if err := SaveTemplate(newName, src.Tree); err != nil {
		return err
	}
	// When the key is unchanged (e.g. case-only rename "report" → "Report") the
	// destination file *is* the source file: it was just rewritten, so deleting
	// oldName would wipe the renamed template. Skip the delete in that case.
	if newKey == oldKey {
		return nil
	}
	return DeleteTemplate(oldName)
}

func DuplicateTemplate(name string) (Template, error) {
	templates, err := LoadTemplates()
	if err != nil {
		return Template{}, err
	}
	existing := make(map[string]bool, len(templates))
	var src *Template
	for i := range templates {
		existing[templates[i].Name] = true
		if templates[i].Name == name {
			src = &templates[i]
		}
	}
	if src == nil {
		return Template{}, errors.New("template non trovato: " + name)
	}
	newName := name + " (copia)"
	for i := 2; existing[newName]; i++ {
		newName = fmt.Sprintf("%s (copia %d)", name, i)
	}
	if err := SaveTemplate(newName, src.Tree); err != nil {
		return Template{}, err
	}
	return Template{Name: newName, Tree: src.Tree}, nil
}

func ImportTemplate(path string) (Template, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Template{}, err
	}
	var tpl Template
	if err := json.Unmarshal(data, &tpl); err != nil {
		// Try plain list format
		var nodes []Node
		if err2 := json.Unmarshal(data, &nodes); err2 != nil {
			return Template{}, errors.New("formato JSON non riconosciuto")
		}
		tpl.Tree = nodes
	}
	if err := ValidateTree(tpl.Tree, 0); err != nil {
		return Template{}, err
	}
	return tpl, nil
}

func ExportTemplate(name, destPath string, tree []Node) error {
	tpl := Template{Name: name, Tree: tree}
	data, err := json.MarshalIndent(tpl, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(destPath, data, 0o644)
}

// sanitizeFilename strips characters unsafe for filenames.
// NB: replicata in frontend/src/utils/sanitize.ts (sanitizeFilename) — se
// modifichi questa logica, aggiorna anche la versione TS.
func sanitizeFilename(name string) string {
	replacer := strings.NewReplacer(
		"/", "_", "\\", "_", ":", "_", "*", "_",
		"?", "_", `"`, "_", "<", "_", ">", "_", "|", "_",
	)
	s := replacer.Replace(name)
	if len(s) > 100 {
		runes := []rune(s)
		if len(runes) > 100 {
			s = string(runes[:100])
		}
	}
	return s
}

// templateNameKey is the normalized collision key for a template name: the
// sanitized filename, lowercased. Two names sharing a key map to the same file
// on disk (case-insensitive filesystems, or names that sanitize identically).
// NB: replicata in frontend/src/utils/sanitize.ts (templateNameKey) — se
// modifichi questa logica, aggiorna anche la versione TS.
func templateNameKey(name string) string {
	return strings.ToLower(sanitizeFilename(strings.TrimSpace(name)))
}
