import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const responses=sqliteTable('responses',{id:text('id').primaryKey(),name:text('name').notNull(),attendance:text('attendance').notNull(),guests:text('guests').notNull(),note:text('note').notNull(),createdAt:text('created_at').notNull()});
