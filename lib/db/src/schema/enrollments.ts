import { pgTable, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { classesTable } from "./classes";

export const enrollmentsTable = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.studentId, t.classId)]
);

export type Enrollment = typeof enrollmentsTable.$inferSelect;
