import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import WorshipTeamToggle from '@/app/admin/WorshipTeamToggle'
import WorshipOnlyToggle from '@/app/admin/WorshipOnlyToggle'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const avatarColors = ['#FF4D4D','#FF9500','#4CAF50','#6C63FF','#00BCD4','#E91E63','#FF6B35','#A855F7']
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]

export default async function WorshipAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/worship')

  const { data: worshipMembers } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, display_name, role, is_worship_team, is_worship_only, is_approved, email')
    .eq('is_worship_team', true)
    .eq('is_approved', true)
    .order('full_name')

  const members = worshipMembers ?? []
  const worshipOnlyMembers = members.filter((m) => m.is_worship_only && m.role !== 'admin')
  const bothAccessMembers = members.filter((m) => !m.is_worship_only || m.role === 'admin')

  function MemberCard({ member }: { member: typeof members[0] }) {
    const name = member.display_name ?? member.full_name
    const avatarColor = getAvatarColor(member.full_name)
    const initials = member.full_name.trim().split(' ').length >= 2
      ? `${member.full_name.trim().split(' ')[0][0]}${member.full_name.trim().split(' ').at(-1)![0]}`
      : member.full_name.slice(0, 2)

    return (
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0, textTransform: 'uppercase' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
            {member.id === user!.id && (
              <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>you</span>
            )}
          </p>
          {member.email && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</p>
          )}
        </div>
        {member.id !== user!.id && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <WorshipTeamToggle memberId={member.id} isWorshipTeam={member.is_worship_team ?? false} />
            <WorshipOnlyToggle memberId={member.id} isWorshipOnly={member.is_worship_only ?? false} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '32px 20px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Worship team</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
          {members.length} member{members.length !== 1 ? 's' : ''} · {worshipOnlyMembers.length} worship-only
        </p>
      </div>

      {worshipOnlyMembers.length > 0 && (
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Worship planner only
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {worshipOnlyMembers.map((m) => <MemberCard key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {bothAccessMembers.length > 0 && (
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Gather + Worship access
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bothAccessMembers.map((m) => <MemberCard key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No worship team members yet.</p>
        </div>
      )}
    </div>
  )
}
