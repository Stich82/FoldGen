package backend

import (
	"os"
	"path/filepath"
	"testing"
)

// TestCreateStructureNeverTruncatesFiles is the regression guard for the
// critical safety bug: FoldGen must never create, truncate or overwrite a file.
// A real file with content is placed on disk, then CreateStructure runs over a
// tree that contains a file node with the SAME name. The file must survive
// untouched, and the file node must be reported as skipped.
func TestCreateStructureNeverTruncatesFiles(t *testing.T) {
	base := t.TempDir()

	const content = "DATI IMPORTANTI"
	existing := filepath.Join(base, "notes.txt")
	if err := os.WriteFile(existing, []byte(content), 0o644); err != nil {
		t.Fatalf("setup: impossibile scrivere il file reale: %v", err)
	}

	tree := []Node{
		{Name: "src"},                     // cartella → creata
		{Name: "notes.txt", IsFile: true}, // file con lo stesso nome → DEVE essere ignorato
	}

	skipped, err := CreateStructure(base, tree)
	if err != nil {
		t.Fatalf("CreateStructure ha restituito errore: %v", err)
	}

	got, err := os.ReadFile(existing)
	if err != nil {
		t.Fatalf("il file reale non esiste più dopo CreateStructure: %v", err)
	}
	if string(got) != content {
		t.Fatalf("il file è stato modificato/troncato: atteso %q, ottenuto %q", content, string(got))
	}

	if skipped != 1 {
		t.Fatalf("skipped atteso 1, ottenuto %d", skipped)
	}

	// La cartella deve invece essere stata creata.
	if info, err := os.Stat(filepath.Join(base, "src")); err != nil || !info.IsDir() {
		t.Fatalf("la cartella 'src' non è stata creata: err=%v", err)
	}
}

// TestCreateStructureCreatesFoldersOnly verifies nested folders are created,
// no file node ever lands on disk, and skipped counts every file node.
func TestCreateStructureCreatesFoldersOnly(t *testing.T) {
	base := t.TempDir()

	tree := []Node{
		{Name: "a", Children: []Node{
			{Name: "b", Children: []Node{
				{Name: "deep.txt", IsFile: true}, // file annidato → ignorato
			}},
			{Name: "readme.md", IsFile: true}, // file annidato → ignorato
		}},
	}

	skipped, err := CreateStructure(base, tree)
	if err != nil {
		t.Fatalf("CreateStructure ha restituito errore: %v", err)
	}
	if skipped != 2 {
		t.Fatalf("skipped atteso 2, ottenuto %d", skipped)
	}

	// Le cartelle annidate esistono.
	if info, err := os.Stat(filepath.Join(base, "a", "b")); err != nil || !info.IsDir() {
		t.Fatalf("la cartella annidata 'a/b' non è stata creata: err=%v", err)
	}

	// Nessun nodo-file è presente su disco.
	for _, p := range []string{
		filepath.Join(base, "a", "b", "deep.txt"),
		filepath.Join(base, "a", "readme.md"),
	} {
		if _, err := os.Stat(p); !os.IsNotExist(err) {
			t.Fatalf("un nodo-file è stato creato su disco: %s (err=%v)", p, err)
		}
	}
}
