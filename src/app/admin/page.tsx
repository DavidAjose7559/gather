import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RoleToggle from './RoleToggle'
import CopyButton from './CopyButton'

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
    .select('id, full_name, display_name, role')
    .order('full_name')

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatherdaily.app'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage members</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {members?.length ?? 0} people in the group
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 hover:text-gray-600 min-h-[44px] flex items-center"
          >
            ← Home
          </Link>
        </div>

        {/* Invite section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
          <h2 className="font-semibold text-gray-900">Invite someone</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Share this link with anyone you'd like to invite. They can sign up
            with their email address and join the group.
          </p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2.5">
            <span className="text-sm text-gray-700 flex-1 truncate font-mono">{appUrl}</span>
            <CopyButton text={appUrl} />
          </div>
          <p className="text-xs text-gray-400">
            Anyone with the link can join — adjust their role below if needed.
          </p>
        </div>

        {/* Member list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Current members
          </h2>
          <div className="flex flex-col gap-2">
            {(members ?? []).map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {member.display_name ?? member.full_name}
                    {member.id === user.id && (
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">you</span>
                    )}
                  </p>
                  {member.display_name && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{member.full_name}</p>
                  )}
                </div>
                <RoleToggle
                  memberId={member.id}
                  currentRole={member.role as 'member' | 'admin'}
                  isSelf={member.id === user.id}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
