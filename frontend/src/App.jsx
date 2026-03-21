import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ethers } from 'ethers'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const sosTypes = ['Medical', 'Fire', 'Accident', 'Crime', 'Disaster', 'Other']
const roles = ['user', 'admin', 'volunteer']
const verdicts = ['completed', 'fake']
const badge = {
  pending: 'border-slate-200/20 bg-slate-200/10 text-slate-100',
  assigned: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100',
  volunteer_completed: 'border-teal-400/30 bg-teal-500/10 text-teal-100',
  volunteer_fake: 'border-rose-300/30 bg-rose-500/10 text-rose-100',
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  fake: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  disputed: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  Critical: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  High: 'border-orange-300/30 bg-orange-400/10 text-orange-100',
  Medium: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  Low: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
}

const shortAddress = (value) => (value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Not set')
const formatStamp = (value) => (value ? new Date(Number(value) * 1000).toLocaleString() : 'Not recorded')
const formatReward = (weiValue) => {
  if (!weiValue || BigInt(weiValue) === 0n) {
    return '0 ETH'
  }

  try {
    return `${ethers.formatEther(String(weiValue))} ETH`
  } catch {
    return `${weiValue} wei`
  }
}

function Card({ title, action, children }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function RequestView({ request, showChain = true, children }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <p className="text-lg font-semibold text-white">
              #{request.sequenceId} {request.name}
            </p>
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${badge[request.status] || badge.pending}`}>
              {request.status}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${badge[request.priority] || badge.Medium}`}>
              {request.priority}
            </span>
          </div>
          <p className="mt-2 text-sm text-cyan-200">{request.type}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{request.message}</p>
          <p className="mt-2 text-sm text-slate-400">AI: {request.analysisSummary}</p>
        </div>
        <div className="grid gap-2 text-sm text-slate-300">
          <p>Volunteer: {request.assignedVolunteer?.name || 'Not assigned'}</p>
          <p>Wallet: {request.assignedVolunteer?.wallet ? shortAddress(request.assignedVolunteer.wallet) : 'Not assigned'}</p>
          <p>Volunteer report: {request.volunteerVerification?.status || 'waiting'}</p>
          <p>Admin final: {request.adminVerification?.status || 'waiting'}</p>
          <p>Final result: {request.finalStatus || 'pending'}</p>
          {showChain ? (
            <>
              <p>Create tx: {request.blockchain?.createdTxHash ? shortAddress(request.blockchain.createdTxHash) : 'pending'}</p>
              <p>Assign tx: {request.blockchain?.assignedTxHash ? shortAddress(request.blockchain.assignedTxHash) : 'pending'}</p>
              <p>Volunteer tx: {request.blockchain?.volunteerReportedTxHash ? shortAddress(request.blockchain.volunteerReportedTxHash) : 'pending'}</p>
              <p>Finalize tx: {request.blockchain?.completedTxHash ? shortAddress(request.blockchain.completedTxHash) : request.blockchain?.lastError || 'pending'}</p>
            </>
          ) : null}
        </div>
      </div>
      {children}
    </article>
  )
}

function ProofPanel({
  proofId,
  setProofId,
  proof,
  loadProof,
  reputationWallet,
  setReputationWallet,
  reputation,
  loadReputation,
  web3,
}) {
  return (
    <Card title="On-chain Proof & Reputation">
      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm break-all">
          <p>Contract: {web3.contractAddress || 'Not configured yet'}</p>
          <p className="mt-2">Reward on final completion: {web3.rewardAmountWei ? formatReward(web3.rewardAmountWei) : 'Unknown'}</p>
        </div>
        <input
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
          placeholder="SOS ID to read from blockchain"
          value={proofId}
          onChange={(e) => setProofId(e.target.value)}
        />
        <button type="button" onClick={loadProof} className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
          Load on-chain SOS
        </button>
        {proof ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p>Reporter: {proof.sos?.reporterName || '-'}</p>
            <p>Reporter wallet: {proof.sos?.reporterWallet ? shortAddress(proof.sos.reporterWallet) : '-'}</p>
            <p>Message: {proof.sos?.message || '-'}</p>
            <p>Type: {proof.sos?.emergencyType || '-'}</p>
            <p>Priority: {proof.sos?.priority || '-'}</p>
            <p>Suspicious: {String(proof.sos?.suspicious ?? false)}</p>
            <p>Status: {proof.sos?.status || '-'}</p>
            <p>Volunteer: {proof.sos?.volunteerName || '-'}</p>
            <p>Wallet: {proof.sos?.volunteerWallet ? shortAddress(proof.sos.volunteerWallet) : '-'}</p>
            <p>Assigned by: {proof.sos?.assignedBy || '-'}</p>
            <p>Volunteer reported: {proof.sos?.volunteerReportedStatus || '-'}</p>
            <p>Volunteer note: {proof.sos?.volunteerNote || '-'}</p>
            <p>Finalized by: {proof.sos?.finalizedBy || '-'}</p>
            <p>Admin note: {proof.sos?.adminNote || '-'}</p>
            <p>Created: {formatStamp(proof.sos?.createdAt)}</p>
            <p>Assigned: {formatStamp(proof.sos?.assignedAt)}</p>
            <p>Volunteer reported at: {formatStamp(proof.sos?.volunteerReportedAt)}</p>
            <p>Finalized: {formatStamp(proof.sos?.completedAt)}</p>
            <p>Reward paid: {formatReward(proof.sos?.rewardPaidWei)}</p>
            <p>Reward paid at: {formatStamp(proof.sos?.rewardPaidAt)}</p>
            <p className="mt-2 text-slate-400">{proof.message}</p>
          </div>
        ) : null}
        <input
          className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
          placeholder="Wallet to lookup reputation"
          value={reputationWallet}
          onChange={(e) => setReputationWallet(e.target.value)}
        />
        <button type="button" onClick={loadReputation} className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
          Check reputation
        </button>
        {reputation ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm">
            Reputation: {reputation.available ? reputation.reputation : 'Unavailable'} | Reward amount: {reputation.rewardAmountWei ? formatReward(reputation.rewardAmountWei) : 'Unknown'} | {reputation.message}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function App() {
  const [requests, setRequests] = useState([])
  const [health, setHealth] = useState({ api: 'loading', database: false, message: 'Checking system...' })
  const [web3, setWeb3] = useState({ configured: false, contractAddress: '', rewardAmountWei: null })
  const [session, setSession] = useState(() => JSON.parse(window.localStorage.getItem('resqnet-session') || 'null'))
  const [access, setAccess] = useState({ role: 'user', name: '', wallet: '' })
  const [createForm, setCreateForm] = useState({ name: '', message: '', type: 'Medical' })
  const [createMsg, setCreateMsg] = useState('')
  const [assignDrafts, setAssignDrafts] = useState({})
  const [volunteerNotes, setVolunteerNotes] = useState({})
  const [adminNotes, setAdminNotes] = useState({})
  const [proofId, setProofId] = useState('')
  const [proof, setProof] = useState(null)
  const [reputationWallet, setReputationWallet] = useState('')
  const [reputation, setReputation] = useState(null)

  const refresh = async () => {
    try {
      const [h, r, w] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/health`),
        axios.get(`${apiBaseUrl}/api/sos`),
        axios.get(`${apiBaseUrl}/api/web3/status`),
      ])
      setHealth({ api: 'online', database: h.data.database.connected, message: h.data.message })
      setRequests(r.data.sosRequests)
      setWeb3(w.data)
    } catch {
      setHealth({ api: 'offline', database: false, message: 'Backend is not reachable.' })
      setRequests([])
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (session) {
      window.localStorage.setItem('resqnet-session', JSON.stringify(session))
    } else {
      window.localStorage.removeItem('resqnet-session')
    }
  }, [session])

  const myRequests = useMemo(() => {
    if (!session?.name) return []
    return requests.filter((request) => request.name.toLowerCase() === session.name.toLowerCase())
  }, [requests, session])

  const volunteerRequests = useMemo(() => {
    if (!session?.wallet) return []
    return requests.filter(
      (request) => request.assignedVolunteer?.wallet?.toLowerCase() === session.wallet.toLowerCase(),
    )
  }, [requests, session])

  const enter = (event) => {
    event.preventDefault()
    const next = { ...access, name: access.name.trim(), wallet: access.wallet.trim() }
    setSession(next)
    if (next.role === 'user') {
      setCreateForm((current) => ({ ...current, name: next.name }))
    }
    if (next.wallet) {
      setReputationWallet(next.wallet)
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) return
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    setAccess((current) => ({ ...current, wallet: address }))
    setSession((current) => (current ? { ...current, wallet: address } : current))
    setReputationWallet(address)
  }

  const createSOS = async (event) => {
    event.preventDefault()
    try {
      await axios.post(`${apiBaseUrl}/api/sos`, {
        ...createForm,
        reporterWallet: session?.wallet || '',
      })
      setCreateMsg('SOS created and stored on blockchain.')
      setCreateForm({ name: session?.name || '', message: '', type: 'Medical' })
      await refresh()
    } catch (error) {
      setCreateMsg(error.response?.data?.message || 'Failed to create SOS.')
    }
  }

  const assign = async (id) => {
    try {
      await axios.put(`${apiBaseUrl}/api/sos/${id}/assign`, {
        ...(assignDrafts[id] || {}),
        assignedBy: session?.name || 'Admin',
      })
      await refresh()
    } catch (error) {
      setCreateMsg(error.response?.data?.message || 'Failed to assign volunteer.')
    }
  }

  const volunteerReport = async (request, status) => {
    try {
      await axios.put(`${apiBaseUrl}/api/sos/${request._id}/volunteer-confirm`, {
        status,
        note: volunteerNotes[request._id] || '',
        volunteerWallet: session?.wallet || request.assignedVolunteer?.wallet,
      })
      await refresh()
    } catch (error) {
      setCreateMsg(error.response?.data?.message || 'Failed to record volunteer report.')
    }
  }

  const adminFinalize = async (request, status) => {
    try {
      await axios.put(`${apiBaseUrl}/api/sos/${request._id}/admin-confirm`, {
        status,
        note: adminNotes[request._id] || '',
        finalizedBy: session?.name || 'Admin',
      })
      await refresh()
    } catch (error) {
      setCreateMsg(error.response?.data?.message || 'Failed to finalize SOS.')
    }
  }

  const loadProof = async () => {
    if (!proofId) return
    try {
      const response = await axios.get(`${apiBaseUrl}/api/web3/sos/${proofId}`)
      setProof(response.data)
    } catch {
      setProof(null)
    }
  }

  const loadReputation = async () => {
    if (!reputationWallet) return
    try {
      const response = await axios.get(`${apiBaseUrl}/api/web3/reputation/${reputationWallet}`)
      setReputation(response.data)
    } catch {
      setReputation(null)
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-6 py-10 sm:px-10">
          <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.32),_transparent_30%),linear-gradient(140deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))] p-8">
            <p className="text-sm uppercase tracking-[0.45em] text-orange-300">ResQNet</p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight sm:text-6xl">Volunteer rewards on final on-chain confirmation.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">The volunteer reports first. Admin gives the final confirmation. Successful finalization transfers Sepolia ETH through the smart contract.</p>
          </div>
          <Card
            title="Access Portal"
            action={
              <button type="button" onClick={connectWallet} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                Connect wallet
              </button>
            }
          >
            <form className="grid gap-4 md:grid-cols-2" onSubmit={enter}>
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" value={access.role} onChange={(e) => setAccess((c) => ({ ...c, role: e.target.value }))}>
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" placeholder="Display name" value={access.name} onChange={(e) => setAccess((c) => ({ ...c, name: e.target.value }))} />
              {access.role === 'volunteer' ? (
                <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 md:col-span-2" placeholder="Volunteer wallet" value={access.wallet} onChange={(e) => setAccess((c) => ({ ...c, wallet: e.target.value }))} />
              ) : null}
              <button type="submit" className="rounded-2xl bg-orange-400 px-5 py-3 font-semibold text-slate-950 md:col-span-2">
                Enter workspace
              </button>
            </form>
            <div className="mt-4 text-sm text-slate-300">Health: {health.message}</div>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
        <header className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.3),_transparent_28%),linear-gradient(140deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-orange-300">ResQNet</p>
              <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{session.role.toUpperCase()} Workspace</h1>
              <p className="mt-3 text-slate-300">
                {session.name || 'Anonymous'} {session.wallet ? `| ${shortAddress(session.wallet)}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">API: {health.api}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">DB: {health.database ? 'connected' : 'offline'}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">Reward: {web3.rewardAmountWei ? formatReward(web3.rewardAmountWei) : 'unknown'}</span>
              <button type="button" onClick={() => setSession(null)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                Switch role
              </button>
            </div>
          </div>
        </header>

        {createMsg ? <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">{createMsg}</div> : null}

        {session.role === 'user' ? (
          <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
            <Card title="Create SOS">
              <form className="grid gap-4" onSubmit={createSOS}>
                <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={createForm.name} onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))} />
                <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3" value={createForm.type} onChange={(e) => setCreateForm((c) => ({ ...c, type: e.target.value }))}>
                  {sosTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <textarea className="min-h-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={createForm.message} onChange={(e) => setCreateForm((c) => ({ ...c, message: e.target.value }))} placeholder="Describe the emergency" />
                <button type="submit" className="rounded-2xl bg-orange-400 px-5 py-3 font-semibold text-slate-950">
                  Send SOS
                </button>
              </form>
            </Card>
            <div className="space-y-8">
              <Card title="My Requests">
                <div className="space-y-4">
                  {myRequests.length ? myRequests.map((request) => <RequestView key={request._id} request={request} />) : <div className="text-sm text-slate-300">No requests yet.</div>}
                </div>
              </Card>
              <ProofPanel proofId={proofId} setProofId={setProofId} proof={proof} loadProof={loadProof} reputationWallet={reputationWallet} setReputationWallet={setReputationWallet} reputation={reputation} loadReputation={loadReputation} web3={web3} />
            </div>
          </div>
        ) : null}

        {session.role === 'admin' ? (
          <Card
            title="Assign & Finalize"
            action={
              <button type="button" onClick={refresh} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                Refresh
              </button>
            }
          >
            <p className="mb-4 text-sm text-slate-300">Admins can assign volunteers and give the final completion decision. Blockchain proof stays hidden from this workspace.</p>
            <div className="space-y-4">
              {requests.length ? (
                requests.map((request) => (
                  <RequestView key={request._id} request={request} showChain={false}>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Assign volunteer</p>
                        <div className="mt-3 grid gap-3">
                          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm" placeholder="Volunteer name" value={assignDrafts[request._id]?.volunteerName || request.assignedVolunteer?.name || ''} onChange={(e) => setAssignDrafts((c) => ({ ...c, [request._id]: { ...(c[request._id] || {}), volunteerName: e.target.value } }))} />
                          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm" placeholder="Volunteer wallet" value={assignDrafts[request._id]?.volunteerWallet || request.assignedVolunteer?.wallet || ''} onChange={(e) => setAssignDrafts((c) => ({ ...c, [request._id]: { ...(c[request._id] || {}), volunteerWallet: e.target.value } }))} />
                          <button type="button" onClick={() => assign(request._id)} className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950">
                            Assign volunteer
                          </button>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Admin final confirmation</p>
                        <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm" placeholder="Admin review note" value={adminNotes[request._id] || ''} onChange={(e) => setAdminNotes((c) => ({ ...c, [request._id]: e.target.value }))} />
                        <div className="mt-3 flex flex-wrap gap-3">
                          {verdicts.map((status) => (
                            <button key={status} type="button" onClick={() => adminFinalize(request, status)} className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950" disabled={!request.volunteerVerification?.status || request.finalStatus !== 'pending'}>
                              Finalize {status}
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-400">If volunteer and admin both say completed, the contract sends {web3.rewardAmountWei ? formatReward(web3.rewardAmountWei) : 'the configured reward'} to the assigned volunteer wallet.</p>
                      </div>
                    </div>
                  </RequestView>
                ))
              ) : (
                <div className="text-sm text-slate-300">No SOS requests yet.</div>
              )}
            </div>
          </Card>
        ) : null}

        {session.role === 'volunteer' ? (
          <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
            <Card
              title="Assigned Tasks"
              action={
                <button type="button" onClick={connectWallet} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                  Connect wallet
                </button>
              }
            >
              <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm">Wallet: {session.wallet ? shortAddress(session.wallet) : 'Not set'}</div>
              <div className="space-y-4">
                {volunteerRequests.length ? (
                  volunteerRequests.map((request) => (
                    <RequestView key={request._id} request={request}>
                      <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Volunteer report</p>
                        <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm" placeholder="Volunteer notes" value={volunteerNotes[request._id] || ''} onChange={(e) => setVolunteerNotes((c) => ({ ...c, [request._id]: e.target.value }))} />
                        <div className="mt-3 flex flex-wrap gap-3">
                          {verdicts.map((status) => (
                            <button key={status} type="button" onClick={() => volunteerReport(request, status)} className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950" disabled={Boolean(request.volunteerVerification?.status) || request.finalStatus !== 'pending'}>
                              Mark {status}
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-400">This saves your report on-chain, but the ETH reward only moves after admin final confirmation.</p>
                      </div>
                    </RequestView>
                  ))
                ) : (
                  <div className="text-sm text-slate-300">No tasks assigned to this wallet.</div>
                )}
              </div>
            </Card>
            <ProofPanel proofId={proofId} setProofId={setProofId} proof={proof} loadProof={loadProof} reputationWallet={reputationWallet} setReputationWallet={setReputationWallet} reputation={reputation} loadReputation={loadReputation} web3={web3} />
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
