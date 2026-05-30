# Phase 09: Testing & Validation

**Priority:** Critical — ensure quality  
**Status:** Pending  
**Estimated Effort:** Medium  
**Blocked By:** All prior phases

## Context

Need to verify the entire feature works end-to-end: create league, add teams, play matches, verify standings, end session, check champion.

## Requirements

### Functional
- Regular sessions unchanged
- Tournament sessions unchanged
- League creation wizard works
- League team management works
- League match creation works
- Standings calculate correctly
- Round-robin schedule generates correctly
- Ending league session computes champion
- Backward compatibility: existing sessions work

### Non-functional
- `npm run build` passes
- `npm run lint` passes
- No console errors

## Test Scenarios

### 1. Database Migration
- [ ] Migration runs clean on fresh DB
- [ ] Existing sessions have correct type
- [ ] League tables have proper RLS

### 2. Regular Session (Regression)
- [ ] Create regular session → works
- [ ] Add matches → works
- [ ] End session → ratings updated
- [ ] Delete session → cleans up

### 3. Tournament Session (Regression)
- [ ] Create tournament session → works
- [ ] Duplicate tournament blocked → works
- [ ] Tournament badge shows → works

### 4. League Session — Full Flow
- [ ] Create league: MD, 2 rounds, 4 teams
- [ ] Teams created with correct rosters
- [ ] Schedule shows 6 rounds
- [ ] Play Round 1 Match 1: Red vs Blue, Red wins
- [ ] Standings: Red 2pts, Blue 0pts
- [ ] Play Round 1 Match 2: Green vs Yellow, Yellow wins
- [ ] Standings: Red 2, Yellow 2, Blue 0, Green 0
- [ ] Complete all matches
- [ ] End session → champion = top team
- [ ] Individual player ratings updated

### 5. Edge Cases
- [ ] League with 2 teams (minimum)
- [ ] League with 3 teams (odd number)
- [ ] League with 1 round
- [ ] Delete team before any matches
- [ ] Try create match with same team on both sides → blocked

## Success Criteria

- [ ] All regression tests pass
- [ ] Full league flow works end-to-end
- [ ] Build and lint clean
- [ ] No type errors
- [ ] No console warnings

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Standing calculation off-by-one | Test with known results, verify manually |
| Round-robin algorithm wrong | Test with 3, 4 teams, verify each team plays every other |

## Next Steps

After testing passes, run `code-reviewer` agent on all changed files.
