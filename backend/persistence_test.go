package backend

import "testing"

// findTemplate returns the loaded template with the given exact name, or nil.
func findTemplate(t *testing.T, name string) *Template {
	t.Helper()
	templates, err := LoadTemplates()
	if err != nil {
		t.Fatalf("LoadTemplates: %v", err)
	}
	for i := range templates {
		if templates[i].Name == name {
			return &templates[i]
		}
	}
	return nil
}

// TestRenameTemplate_CollisionRejected verifies that renaming onto the name of a
// different existing template fails without touching either template on disk.
func TestRenameTemplate_CollisionRejected(t *testing.T) {
	t.Setenv("FOLDGEN_DATA_DIR", t.TempDir())

	if err := SaveTemplate("Acme Engineering", []Node{{Name: "src"}}); err != nil {
		t.Fatalf("SaveTemplate(Acme Engineering): %v", err)
	}
	if err := SaveTemplate("Sample Project", []Node{{Name: "docs"}}); err != nil {
		t.Fatalf("SaveTemplate(Sample Project): %v", err)
	}

	if err := RenameTemplate("Acme Engineering", "Sample Project"); err == nil {
		t.Fatal("expected error renaming onto an existing template, got nil")
	}

	acme := findTemplate(t, "Acme Engineering")
	if acme == nil {
		t.Fatal("source template lost after rejected rename")
	}
	if len(acme.Tree) != 1 || acme.Tree[0].Name != "src" {
		t.Errorf("source template content changed: %+v", acme.Tree)
	}

	sample := findTemplate(t, "Sample Project")
	if sample == nil {
		t.Fatal("collision target lost after rejected rename")
	}
	if len(sample.Tree) != 1 || sample.Tree[0].Name != "docs" {
		t.Errorf("collision target content changed: %+v", sample.Tree)
	}
}

// TestRenameTemplate_CaseOnly is the critical data-loss regression: on a
// case-insensitive filesystem "report" and "Report" share one file, so the old
// flow rewrote then deleted that single file. The renamed template must survive
// with its content intact.
func TestRenameTemplate_CaseOnly(t *testing.T) {
	t.Setenv("FOLDGEN_DATA_DIR", t.TempDir())

	tree := []Node{{Name: "Q1", Children: []Node{{Name: "summary.md", IsFile: true}}}}
	if err := SaveTemplate("report", tree); err != nil {
		t.Fatalf("SaveTemplate(report): %v", err)
	}

	if err := RenameTemplate("report", "Report"); err != nil {
		t.Fatalf("RenameTemplate(report -> Report): %v", err)
	}

	renamed := findTemplate(t, "Report")
	if renamed == nil {
		t.Fatal("template lost after case-only rename")
	}
	if len(renamed.Tree) != 1 || renamed.Tree[0].Name != "Q1" {
		t.Fatalf("renamed template content lost: %+v", renamed.Tree)
	}
	if len(renamed.Tree[0].Children) != 1 || renamed.Tree[0].Children[0].Name != "summary.md" {
		t.Errorf("nested content lost: %+v", renamed.Tree[0].Children)
	}
}

// TestRenameTemplate_FreeName covers a normal rename to an unused name: the old
// name disappears and the new one carries the content.
func TestRenameTemplate_FreeName(t *testing.T) {
	t.Setenv("FOLDGEN_DATA_DIR", t.TempDir())

	if err := SaveTemplate("Acme Engineering", []Node{{Name: "src"}}); err != nil {
		t.Fatalf("SaveTemplate(Acme Engineering): %v", err)
	}

	if err := RenameTemplate("Acme Engineering", "Sample Project"); err != nil {
		t.Fatalf("RenameTemplate: %v", err)
	}

	if findTemplate(t, "Acme Engineering") != nil {
		t.Error("old template still present after rename")
	}
	renamed := findTemplate(t, "Sample Project")
	if renamed == nil {
		t.Fatal("renamed template missing")
	}
	if len(renamed.Tree) != 1 || renamed.Tree[0].Name != "src" {
		t.Errorf("renamed template content changed: %+v", renamed.Tree)
	}
}
