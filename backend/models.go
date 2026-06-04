package backend

// Node represents a single item (folder or file) in the tree.
type Node struct {
	Name     string `json:"name"`
	Children []Node `json:"children,omitempty"`
	IsFile   bool   `json:"is_file,omitempty"`
	Color    string `json:"color,omitempty"`
}

// Template is a named folder structure.
type Template struct {
	Name string `json:"template_name"`
	Tree []Node `json:"tree"`
}

// Settings holds global application preferences.
type Settings struct {
	Accent        string   `json:"accent"`
	AccentCustom  []string `json:"accent_custom,omitempty"`
	FontSize      int      `json:"font_size"`
	DefaultOutput string   `json:"default_output"`
	ScanHidden    bool     `json:"scan_hidden"`
	ScanMaxDepth  int      `json:"scan_max_depth"`
	Theme         string   `json:"theme,omitempty"`
	ColorMode     string   `json:"color_mode,omitempty"`    // "palette" | "depth" | "single"
	Palette       []string `json:"palette,omitempty"`       // up to 4 hex colors for palette mode
	DepthPrimary  string   `json:"depth_primary,omitempty"` // primary hex for depth-gradient mode
	SingleColor   string   `json:"single_color,omitempty"`  // hex for single-color mode
}

var DefaultSettings = Settings{
	Accent:        "#4F8EF7",
	FontSize:      13,
	DefaultOutput: "",
	ScanHidden:    false,
	ScanMaxDepth:  30,
	Theme:         "dark",
	ColorMode:     "depth",
	Palette:       []string{"#4F8EF7", "#A78BFA", "#34D399", "#FB923C"},
	DepthPrimary:  "#2563EB",
	SingleColor:   "#4F8EF7",
}
