import type { Request, Response } from "express";

import pool from "../config/db.js";

type CsvStudentRow = Record<string, unknown>;

type ProfileScopedRequest = Request & {
  profile?: {
    id: string;
    branch_id: string;
    role: string;
  };
};

function errorResponse(message: string) {
  return { error: true, message };
}

const MAIN_CSV_COLUMNS = new Set(["First Name", "Last Name", "Contact"]);

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

function getImportRows(body: unknown): CsvStudentRow[] | null {
  if (Array.isArray(body)) {
    return body as CsvStudentRow[];
  }

  if (
    body &&
    typeof body === "object" &&
    "students" in body &&
    Array.isArray((body as { students?: unknown }).students)
  ) {
    return (body as { students: CsvStudentRow[] }).students;
  }

  return null;
}

function mapCsvRow(row: CsvStudentRow) {
  const metadata = Object.fromEntries(
    Object.entries(row).filter(([column]) => !MAIN_CSV_COLUMNS.has(column)),
  );

  return {
    firstName: toNullableString(row["First Name"]),
    lastName: toNullableString(row["Last Name"]),
    contact: toNullableString(row.Contact),
    metadata,
  };
}

export async function importStudents(req: ProfileScopedRequest, res: Response) {
  const branchId = req.profile?.branch_id;
  const rows = getImportRows(req.body);

  if (!branchId) {
    return res.status(401).json(errorResponse("Profile branch scope is required."));
  }

  if (!rows || rows.length === 0) {
    return res.status(400).json(errorResponse("Student import requires at least one row."));
  }

  const students = rows.map(mapCsvRow);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertedStudents = [];

    for (const student of students) {
      const { rows: insertedRows } = await client.query(
        `
          INSERT INTO public.students (
            branch_id,
            first_name,
            last_name,
            contact,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
          RETURNING id, branch_id, first_name, last_name, contact, metadata
        `,
        [
          branchId,
          student.firstName,
          student.lastName,
          student.contact,
          JSON.stringify(student.metadata),
        ],
      );

      insertedStudents.push(insertedRows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Students imported successfully.",
      count: insertedStudents.length,
      students: insertedStudents,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to import students", error);

    return res.status(500).json(errorResponse("Unable to import students."));
  } finally {
    client.release();
  }
}
