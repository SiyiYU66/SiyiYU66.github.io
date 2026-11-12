CREATE TABLE battleship_rooms (
  code TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX battleship_rooms_expiry ON battleship_rooms (expires_at);
