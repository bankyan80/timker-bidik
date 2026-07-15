import React from 'react';
import StudentManagement, { StudentView } from './StudentManagement';

const VIEW_MAP: Record<string, StudentView> = {
  'students': 'all',
  'students-baru-kelas1': 'baru-kelas1',
  'students-melanjutkan': 'melanjutkan',
  'students-tidak-melanjutkan': 'tidak-melanjutkan',
  'students-kelulusan': 'kelulusan',
};

export default function StudentViewWrapper({ currentModule }: { currentModule: string }) {
  const view = VIEW_MAP[currentModule] || 'all';
  return <StudentManagement view={view} />;
}
