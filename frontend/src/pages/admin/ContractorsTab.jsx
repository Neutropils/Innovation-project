import { useState } from 'react'
import { HardHat, Plus } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { CARD } from '@/components/PageHero'
import { EmptyState } from '@/components/StateViews'
import { contractorSchema } from '@/schemas/admin'
import {
  BTN_PRIMARY, CheckboxField, InactivePill, ListStates, Notice, Pill, RecordForm, RecordRow, TextField, toFormValues, useAdminList,
} from './adminUi'

// Owner: Kwan - Admin > Contractors: the lift companies (F04.2)

const BLANK = { name: '', contactName: '', contactEmail: '', contactPhone: '', isActive: true }

export default function ContractorsTab() {
  const [state, load] = useAdminList('admin:contractors', '/contractors')
  const [editing, setEditing] = useState(null) // null | 'new' | contractor
  const [notice, setNotice] = useState('')
  const contractors = state.data ?? []

  if (editing) {
    const isNew = editing === 'new'
    return (
      <RecordForm
        title={isNew ? 'Add contractor' : `Edit ${editing.name}`}
        initialValues={isNew ? BLANK : toFormValues(BLANK, editing)}
        schema={contractorSchema}
        fieldByCode={{ DUPLICATE_CONTRACTOR: 'name' }}
        save={(values) => (isNew ? api.post('/contractors', values) : api.patch(`/contractors/${editing.id}`, values)).then((res) => res.data.data)}
        onSaved={(contractor) => {
          setEditing(null)
          setNotice(`${contractor.name} ${isNew ? 'added' : 'updated'}.`)
          load()
        }}
        onCancel={() => setEditing(null)}
      >
        <TextField label="Company name" name="name" className="sm:col-span-2" />
        <TextField label="Contact person" name="contactName" optional />
        <TextField label="Contact phone" name="contactPhone" type="tel" optional />
        <TextField label="Contact email" name="contactEmail" type="email" className="sm:col-span-2" optional />
        {!isNew && (
          <CheckboxField
            label="Active"
            name="isActive"
            hint="An inactive company can’t be given lifts. Move its lifts to another contractor first."
            className="sm:col-span-2"
          />
        )}
      </RecordForm>
    )
  }

  return (
    <div className="space-y-4">
      {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

      <div className="flex justify-end">
        <button type="button" onClick={() => { setNotice(''); setEditing('new') }} className={cn(BTN_PRIMARY, 'w-full sm:w-auto')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add contractor
        </button>
      </div>

      <ListStates state={state} load={load} what="contractors" />

      {state.status === 'ready' && contractors.length === 0 && (
        <EmptyState
          Icon={HardHat}
          title="No contractors yet"
          message="Add the lift companies first. Every lift needs one, so its defects go to the right company."
        />
      )}

      {state.status === 'ready' && contractors.length > 0 && (
        <ul aria-label="Contractors" className={cn(CARD, 'divide-y divide-border/70 p-2')}>
          {contractors.map((c) => (
            <RecordRow
              key={c.id}
              title={c.name}
              lines={[[c.contactName, c.contactPhone].filter(Boolean).join(' - '), c.contactEmail]}
              badges={
                <>
                  <Pill tone={c.liftCount > 0 ? 'primary' : 'muted'}>{c.liftCount} lift{c.liftCount === 1 ? '' : 's'}</Pill>
                  {!c.isActive && <InactivePill />}
                </>
              }
              onEdit={() => { setNotice(''); setEditing(c) }}
              editLabel={`Edit ${c.name}`}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
