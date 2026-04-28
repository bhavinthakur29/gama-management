import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStudentBelt, getStudentName, type Student } from '../types/student';

export const studentBelts = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'];

export type StudentModalValues = {
  name: string;
  email: string;
  belt_rank: string;
};

type StudentModalProps = {
  mode: 'add' | 'edit';
  student?: Student | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: StudentModalValues) => void;
};

function getStudentEmail(student?: Student | null) {
  const email = student?.metadata?.email;
  return typeof email === 'string' ? email : '';
}

export function StudentModal({ mode, student, isSaving, onClose, onSubmit }: StudentModalProps) {
  const [values, setValues] = useState<StudentModalValues>({
    name: '',
    email: '',
    belt_rank: 'White',
  });

  useEffect(() => {
    setValues({
      name: student ? getStudentName(student) : '',
      email: getStudentEmail(student),
      belt_rank: student ? getStudentBelt(student) : 'White',
    });
  }, [student]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <motion.div
      className="student-modal card"
      initial={{ y: 24, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 24, opacity: 0, scale: 0.98 }}
    >
      <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">
        <X size={18} />
      </button>

      <div className="modal-heading">
        <p className="eyebrow">{mode === 'edit' ? 'Edit Student' : 'New Student'}</p>
        <h2>{mode === 'edit' ? getStudentName(student ?? {}) : 'Add Student'}</h2>
      </div>

      <form className="student-form" onSubmit={handleSubmit}>
        <label className="full-span">
          <span>Name</span>
          <input
            required
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="Student full name"
          />
        </label>

        <label>
          <span>Email <em>(optional)</em></span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            placeholder="student@example.com"
          />
        </label>

        <label>
          <span>Belt Rank</span>
          <select
            value={values.belt_rank}
            onChange={(event) => setValues((current) => ({ ...current, belt_rank: event.target.value }))}
          >
            {studentBelts.map((belt) => (
              <option key={belt} value={belt}>{belt}</option>
            ))}
          </select>
        </label>

        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Student'}
        </button>
      </form>
    </motion.div>
  );
}
