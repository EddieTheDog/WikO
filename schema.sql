CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO pages (title, content)
VALUES (
  'Main_Page',
  '# Welcome to WikiO\n\nThis is the main page.\n\nVisit [[User:Admin]].'
);
