import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from '../context/AppContext';
import { api } from '../services/cloud';
jest.mock('../services/cloud', () => ({
  cloudEnabled: true,
  api: jest.fn()
}));
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({
        data: {
          session: {
            user: {
              id: 'admin'
            }
          }
        }
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {}
          }
        }
      })
    }
  }
}));
let root, host, context;
const state = () => ({
  users: [{
    id: 'admin',
    name: 'Admin',
    role: 'admin',
    active: true
  }],
  courses: [],
  lessons: [],
  enrollments: [],
  payments: [],
  expenses: [],
  attempts: [],
  submissions: [],
  certificates: [],
  tickets: [],
  progress: {},
  testSessions: {}
});
function Probe() {
  context = useApp();
  return <span>{context.data.courses.length}</span>;
}
beforeEach(async () => {
  api.mockReset();
  api.mockResolvedValue({
    data: state(),
    revision: 1
  });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<AppProvider><Probe /></AppProvider>);
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
test('cloud waits for server success and uses server response', async () => {
  let ok;
  const saved = state();
  saved.courses = [{
    id: 'c',
    title: 'Server course'
  }];
  api.mockResolvedValueOnce({
    data: saved,
    revision: 2
  });
  await act(async () => {
    ok = await context.update(d => d.courses.push({
      id: 'c',
      title: 'Client title'
    }));
  });
  expect(ok).toBe(true);
  expect(context.data.courses[0].title).toBe('Server course');
  expect(api).toHaveBeenLastCalledWith('update', expect.objectContaining({
    revision: 1
  }));
});
test('rejected cloud write does not persist proposed state', async () => {
  api.mockRejectedValueOnce(Error('CONFLICT'));
  let ok;
  await act(async () => {
    ok = await context.update(d => d.courses.push({
      id: 'bad'
    }));
  });
  expect(ok).toBe(false);
  expect(context.data.courses).toHaveLength(0);
  expect(host.textContent).toContain('CONFLICT');
});
