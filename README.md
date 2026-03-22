# ResQNet

ResQNet is an on-chain emergency verification and reputation protocol.

## Roles

- User creates SOS requests.
- Admin assigns volunteers and submits admin verification.
- Volunteer responds in the field and submits volunteer verification.
- Smart contract records the final matched result and updates reputation.

## Architecture

### Off-chain

- SOS intake and storage
- Rule-based AI triage for priority and suspicious detection
- Admin dashboard, volunteer panel, and workflow orchestration
- Consensus check between admin and volunteer

### On-chain

- Final SOS proof
- Volunteer reputation
- Immutable event log

## Run the App

From the project root:

```powershell
npm run backend
```

```powershell
npm run frontend
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Environment Setup

Backend env file:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

For MongoDB Atlas, set `MONGO_URI` in `backend/.env` to your Atlas connection string, for example:

```powershell
MONGO_URI=mongodb+srv://<db-user>:<db-password>@<cluster-name>.mongodb.net/resqnet?retryWrites=true&w=majority&appName=ResQNet
```

Atlas checklist:

- Create a database user in Atlas.
- Add your app server IP to Atlas Network Access, or use `0.0.0.0/0` temporarily for testing.
- Put the database name at the end of the URI, for example `resqnet`.

Root env file for contract tooling:

```powershell
Copy-Item .\.env.example .\.env
```

### Required backend values

- `PORT`
- `MONGO_URI`
- `CLIENT_URL`

### Optional blockchain values

- `RPC_URL`
- `PRIVATE_KEY`
- `CONTRACT_ADDRESS`
- `ETHERSCAN_API_KEY`

If blockchain values are not configured, the app still runs. Final consensus is stored off-chain and the backend reports that on-chain logging is pending configuration.

## Smart Contract

Compile:

```powershell
npm run contracts:compile
```

Deploy to Sepolia:

```powershell
npm run contracts:deploy
```

Verify on Etherscan after deployment:

```powershell
npm run contracts:verify
```

Contract source: `contracts/ResQNetProtocol.sol`

## API Overview

- `POST /api/sos`
- `GET /api/sos`
- `PUT /api/sos/:id/assign`
- `PUT /api/sos/:id/volunteer-confirm`
- `PUT /api/sos/:id/admin-confirm`
- `GET /api/web3/status`
- `GET /api/web3/reputation/:wallet`
