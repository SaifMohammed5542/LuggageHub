'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [userRole, setUserRole] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
      router.replace('/auth/login');
    } else {
      setUserRole(role);
    }
  }, []);

  return (
    <div>
      <h2>Welcome to Dashboard</h2>
      <p>Your Role: {userRole}</p>
      <button onClick={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.replace('/auth/login');
      }}>Logout</button>
    </div>
  );
}
