export const roomDataReducer = (state, action) => {
  const { type, payload } = action;

  if (!state && type !== "room_state" && type !== "game_started") {
    return state;
  }

  switch (type) {
    case "room_state":
    case "game_started":
      return payload.room;

    case "team_created":
    case "team_updated":
      return {
        ...state,
        teams: {
          ...state.teams,
          [payload.team.team_id]: payload.team,
        },
      };

    case "team_deleted": {
      const newTeams = { ...state.teams };
      delete newTeams[payload.team_id];
      return { ...state, teams: newTeams };
    }

    case "player_connected":
    case "player_joined":
      return {
        ...state,
        players: {
          ...state.players,
          [payload.player.user_id]: payload.player,
        },
      };

    case "player_disconnected":
      if (!state.players[payload.player_id]) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [payload.player_id]: {
            ...state.players[payload.player_id],
            is_online: false,
          },
        },
      };

    case "player_left": {
      const newPlayers = { ...state.players };
      delete newPlayers[payload.player_id];
      return { ...state, players: newPlayers };
    }

    case "player_team_changed": {
      const { player_id, old_team_id, new_team_id } = payload;
      const newTeams = { ...state.teams };

      if (old_team_id && newTeams[old_team_id]) {
        newTeams[old_team_id] = {
          ...newTeams[old_team_id],
          player_ids: newTeams[old_team_id].player_ids?.filter(id => id !== player_id) || []
        };
      }

      if (new_team_id && newTeams[new_team_id]) {
        const currentPlayers = newTeams[new_team_id].player_ids || [];
        if (!currentPlayers.includes(player_id)) {
          newTeams[new_team_id] = {
            ...newTeams[new_team_id],
            player_ids: [...currentPlayers, player_id]
          };
        }
      }

      const newPlayers = { ...state.players };
      if (newPlayers[player_id]) {
        newPlayers[player_id] = {
          ...newPlayers[player_id],
          team_id: new_team_id
        };
      }

      return {
        ...state,
        teams: newTeams,
        players: newPlayers,
      };
    }

    case "turn_started":
    case "phase_changed": {
      return {
        ...state,
        current_turn: payload.current_turn
      };
    }

    case "card_dealt": {
      if (!state.current_turn) return state;

      const cardExists = state.current_turn.round_cards?.some(
        (c) => c.card_id === payload.card_id
      );

      if (cardExists) return state;

      const newCard = {
        card_id: payload.card_id,
        content: payload.content,
        status: "UNPLAYED"
      };

      return {
        ...state,
        current_turn: {
          ...state.current_turn,
          round_cards: [...(state.current_turn.round_cards || []), newCard]
        }
      };
    }

    case "card_swiped": {
      if (!state.current_turn || !state.current_turn.round_cards) return state;

      const updatedCards = state.current_turn.round_cards.map(c =>
        c.card_id === payload.card_id ? { ...c, status: payload.status } : c
      );

      return {
        ...state,
        current_turn: {
          ...state.current_turn,
          round_cards: updatedCards
        }
      };
    }

    case "score_updated":
    case "round_results": {
      return {
        ...state,
        teams: {
          ...state.teams,
          [payload.team_id]: {
            ...state.teams[payload.team_id],
            current_position: payload.new_position
          }
        }
      };
    }

    case "game_finished": {
      return {
        ...state,
        status: "FINISHED",
        teams: payload.teams,
        winner_team_id: payload.winner_team_id
      };
    }

    default:
      return state;
  }
};