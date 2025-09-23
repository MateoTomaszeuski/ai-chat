-- Message types lookup table
CREATE TABLE IF NOT EXISTS message_types (
  id INT PRIMARY KEY,
  message_type TEXT NOT NULL
);

-- Insert predefined message types
INSERT INTO message_types (id, message_type) VALUES 
(1, 'User message'),
(2, 'AI response'),
(3, 'Conversation Summary')
ON CONFLICT (id) DO NOTHING;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_type_id INT NOT NULL REFERENCES message_types(id),
  message_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);