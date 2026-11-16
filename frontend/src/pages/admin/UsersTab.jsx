import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { CARD } from '@/components/PageHero'
import { EmptyState } from '@/components/StateViews'
import { USER_ROLES, userSchema } from '@/schemas/admin'
import {
  BTN_PRIMARY, CheckboxField, InactivePill, ListStates, Notice, Pill, RecordForm, RecordRow, SelectField, TextField, toFormValues, useAdminList,
} from './adminUi'

// Owner: Kwan - Admin > Users: accounts, roles and which lift company a contractor
// account belongs to (F04.3, F04.5). Accounts are created here, not by self sign-up.

const BLANK = { name: '', email: '', role: '', contractorId: '', isActive: true }

const roleLabel = (role) => USER_ROLES.find((r) => r.value === role)?.label ?? role

export default function UsersTab() {
  const [state, load] = useAdminList('admin:users', '/users')
  const [contractors, setContractors] = useState(null) // null while loading
  const [editing, setEditing] = useState(null) // null | 'new' | user
  const [notice, setNotice] = useState(null)
  const users = state.data ?? []

  useEffect(() => {
    if (!editing) return
    setContractors(null)
    api.get('/contractors').then((res) => setContractors(res.data.data ?? [])).catch(() => setContractors([]))
  }, [editing])

  if (editing) {
    const isNew = editing === 'new'
    const choices = (contractors ?? []).filter((c) => c.isActive || c.id === editing.contractorId)
    return (
      <RecordForm
        title={isNew ? 'Add user' : `Edit ${editing.name}`}
        initialValues={isNew ? BLANK : toFormValues(BLANK, editing)}
        schema={userSchema}
        fieldByCode={{ DUPLICATE_EMAIL: 'email', CONTRACTOR_REQUIRED: 'contractorId' }}
        save={(values) => (isNew ? api.post('/users', values) : api.patch(`/users/${editing.id}`, values)).then((res) => res.data.data)}
        onSaved={(user) => {
          setEditing(null)
          setNotice({ text: `${user.name} ${isNew ? 'added' : 'updated'}.`, password: user.temporaryPassword })
          load()
        }}
        onCancel={() => setEditing(null)}
      >
        {(values) => (
          <>
            <TextField label="Name" name="name" />
            <TextField label="Email" name="email" type="email" hint="They sign in with this address" />
            <SelectField label="Role" name="role" placeholder="Choose a role" options={USER_ROLES} />
            {values.role === 'contractor' && (
              <SelectField
                label="Lift company"
                name="contractorId"
                placeholder={!contractors ? 'Loading companies…' : choices.length > 0 ? 'Choose a company' : 'No contractors yet - add one first'}
                options={choices.map((c) => ({ value: String(c.id), label: c.name }))}
                hint="This account only sees this company’s defects"
              />
            )}
            {!isNew && (
              <CheckboxField label="Active" name="isActive" hint="Untick to stop this person signing in." className="sm:col-span-2" />
            )}
          </>
        )}
      </RecordForm>
    )
  }

  return (
    <div className="space-y-4">
      {notice && (
        <Notice onDismiss={() => setNotice(null)}>
          <p>{notice.text}</p>
          {notice.password && (
            <p className="mt-1 text-muted-foreground">
              Temporary password: <span className="font-mono font-semibold text-foreground">{notice.password}</span>. It is shown once - pass it on
              to them now.
            </p>
          )}
        </Notice>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => { setNotice(null); setEditing('new') }} className={cn(BTN_PRIMARY, 'w-full sm:w-auto')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add user
        </button>
      </div>

      <ListStates state={state} load={load} what="users" />

      {state.status === 'ready' && users.length === 0 && (
        <EmptyState Icon={Users} title="No users yet" message="Add an account for each inspector and each lift company’s staff." />
      )}

      {state.status === 'ready' && users.length > 0 && (
        <ul aria-label="Users" className={cn(CARD, 'divide-y divide-border/70 p-2')}>
          {users.map((u) => (
            <RecordRow
              key={u.id}
              title={u.name}
              lines={[u.email]}
              badges={
                <>
                  <Pill tone="primary">{roleLabel(u.role)}</Pill>
                  {u.contractorName && <Pill>{u.contractorName}</Pill>}
                  {!u.isActive && <InactivePill />}
                </>
              }
              onEdit={() => { setNotice(null); setEditing(u) }}
              editLabel={`Edit ${u.name}`}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
