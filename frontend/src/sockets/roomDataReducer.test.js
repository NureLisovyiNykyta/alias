import { describe, it, expect } from 'vitest';
import { roomDataReducer } from './roomDataReducer';

describe('roomDataReducer', () => {

  it('should initialize the state when receiving room_state', () => {
    const initialState = null;
    const action = {
      type: 'room_state',
      payload: { room: { id: 'room_1', teams: {}, players: {} } }
    };

    const newState = roomDataReducer(initialState, action);
    expect(newState).toEqual({ id: 'room_1', teams: {}, players: {} });
  });

  it('should not change state for unknown events', () => {
    const initialState = { id: 'room_1' };
    const action = { type: 'unknown_event', payload: {} };

    const newState = roomDataReducer(initialState, action);
    expect(newState).toBe(initialState);
  });

  it('should update the team\'s position when score_updated', () => {
    const initialState = {
      teams: {
        'team_A': { team_id: 'team_A', current_position: 5 }
      }
    };
    const action = {
      type: 'score_updated',
      payload: { team_id: 'team_A', new_position: 15 }
    };

    const newState = roomDataReducer(initialState, action);
    expect(newState.teams['team_A'].current_position).toBe(15);
  });

  it('should change the player status to offline when player disconnected', () => {
    const initialState = {
      players: {
        'player_1': { user_id: 'player_1', is_online: true }
      }
    };
    const action = {
      type: 'player_disconnected',
      payload: { player_id: 'player_1' }
    };

    const newState = roomDataReducer(initialState, action);
    expect(newState.players['player_1'].is_online).toBe(false);
  });

  it('should add a new card to the current turn when card_dealt', () => {
    const initialState = {
      current_turn: { round_cards: [] }
    };
    const action = {
      type: 'card_dealt',
      payload: { card_id: 'card_99', content: 'Apple' }
    };

    const newState = roomDataReducer(initialState, action);
    expect(newState.current_turn.round_cards.length).toBe(1);
    expect(newState.current_turn.round_cards[0]).toEqual({
      card_id: 'card_99',
      content: 'Apple',
      status: 'UNPLAYED'
    });
  });

  it('should move a player between teams when player_team_changed', () => {
    const initialState = {
      players: { 'user_1': { team_id: 'team_1' } },
      teams: {
        'team_1': { player_ids: ['user_1'] },
        'team_2': { player_ids: [] }
      }
    };
    const action = {
      type: 'player_team_changed',
      payload: { player_id: 'user_1', old_team_id: 'team_1', new_team_id: 'team_2' }
    };

    const newState = roomDataReducer(initialState, action);
    expect(newState.teams['team_1'].player_ids).not.toContain('user_1');
    expect(newState.teams['team_2'].player_ids).toContain('user_1');
    expect(newState.players['user_1'].team_id).toBe('team_2');
  });
});
