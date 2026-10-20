import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Worlds Table
export const worlds = sqliteTable('worlds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  genre: text('genre').notNull().default('Dark Fantasy'),
  createdAt: text('created_at').notNull(),
});

// Lore Articles Table
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  category: text('category').notNull().default('Lore'), // Character, Location, Faction, Item, Event, Lore
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''), // Rich text / TipTap JSON
  tagsJson: text('tags_json').notNull().default('[]'),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull(),
});

// Map Pins Table
export const mapPins = sqliteTable('map_pins', {
  id: text('id').primaryKey(),
  mapId: text('map_id').notNull(),
  worldId: text('world_id').notNull().references(() => worlds.id, { onDelete: 'cascade' }),
  articleId: text('article_id').references(() => articles.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  xPct: text('x_pct').notNull(), // Normalized coordinates
  yPct: text('y_pct').notNull(),
  category: text('category').notNull().default('Settlement'),
  icon: text('icon').notNull().default('castle'),
  color: text('color').notNull().default('#f59e0b'),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
});

// TTRPG Statblocks Table
export const statblocks = sqliteTable('statblocks', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  system: text('system').notNull().default('dnd5e'), // dnd5e, pf2e
  name: text('name').notNull(),
  cr: text('cr').notNull().default('1'),
  hp: integer('hp').notNull().default(10),
  ac: integer('ac').notNull().default(10),
  statsJson: text('stats_json').notNull().default('{}'),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
});
