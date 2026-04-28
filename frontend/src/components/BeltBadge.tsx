import type { Student } from '../types';
import { studentBelt } from '../types';

export function BeltBadge({ student }: { student: Pick<Student, 'belt' | 'belt_rank' | 'belt_color'> }) {
  const belt = studentBelt(student);

  return (
    <span
      className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold"
      style={{
        borderColor: student.belt_color ?? '#E5E7EB',
        color: student.belt_color ?? '#92400E',
        backgroundColor: `${student.belt_color ?? '#D97706'}14`,
      }}
    >
      {belt}
    </span>
  );
}
