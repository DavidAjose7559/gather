import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RoleToggle from './RoleToggle'
import WorshipTeamToggle from './WorshipTeamToggle'
import WorshipOnlyToggle from './WorshipOnlyToggle'
import CopyButton from './CopyButton'
import BroadcastForm from './BroadcastForm'
import ReminderForm from './ReminderForm'

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'admin') redirect('/')

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, role, is_worship_team, is_worship_only')
    .order('full_name')

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 448, margin: '0 auto', padding: '56px 16px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Manage members</h1>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {members?.length ?? 0} people in the group
            </p>
          </div>
          <Link
            href="/"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)', minHeight: 44, display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            ← Home
          </Link>
        </div>

        {/* Invite section */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>Invite someone</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Share this link with anyone you&apos;d like to invite. They can sign up
            with their email address and join the group.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card-2)', borderRadius: 12, border: '1px solid var(--border)', padding: '10px 14px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{appUrl}</span>
            <CopyButton text={appUrl} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Anyone with the link can join — adjust their role below if needed.
          </p>
        </div>

        {/* Broadcast message */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>Send a message to everyone</h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Email all {members?.length ?? 0} members at once.
            </p>
          </div>
          <BroadcastForm memberCount={members?.length ?? 0} />
        </div>

        {/* Manual reminder */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>Send check-in reminder</h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Send a nudge to members who haven&apos;t checked in yet today.
            </p>
          </div>
          <ReminderForm memberCount={members?.length ?? 0} />
        </div>

        {/* Member list */}
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Current members
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(members ?? []).map((member) => {
              const name = member.display_name ?? member.full_name
              const avatarColor = getAvatarColor(member.full_name)
              const initials = member.full_name.trim().split(' ').length >= 2
                ? `${member.full_name.trim().split(' ')[0][0]}${member.full_name.trim().split(' ').at(-1)![0]}`
                : member.full_name.slice(0, 2)

              return (
                <div
                  key={member.id}
                  style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, textTransform: 'uppercase' }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                      {member.id === user.id && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>you</span>
                      )}
                    </p>
                    {member.display_name && (
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.full_name}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <RoleToggle
                      memberId={member.id}
                      currentRole={member.role as 'member' | 'admin'}
                      isSelf={member.id === user.id}
                    />
                    {member.id !== user.id && (
                      <WorshipTeamToggle
                        memberId={member.id}
                        isWorshipTeam={member.is_worship_team ?? false}
                      />
                    )}
                    {member.id !== user.id && (
                      <WorshipOnlyToggle
                        memberId={member.id}
                        isWorshipOnly={member.is_worship_only ?? false}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
