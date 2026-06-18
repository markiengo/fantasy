-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
  username character varying NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.team (
  team_id text NOT NULL DEFAULT nextval('team_team_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  fifa_ranking integer,
  elo_rating numeric,
  group_stage character varying,
  CONSTRAINT team_pkey PRIMARY KEY (team_id)
);
CREATE TABLE public.player (
  player_id integer NOT NULL DEFAULT nextval('player_player_id_seq'::regclass),
  name character varying NOT NULL,
  position character varying NOT NULL CHECK ("position"::text = ANY (ARRAY['GK'::character varying, 'DEF'::character varying, 'MID'::character varying, 'FWD'::character varying]::text[])),
  team_id text NOT NULL,
  base_price numeric NOT NULL,
  CONSTRAINT player_pkey PRIMARY KEY (player_id),
  CONSTRAINT fk_player_team FOREIGN KEY (team_id) REFERENCES public.team(team_id)
);
CREATE TABLE public.match (
  match_id integer NOT NULL DEFAULT nextval('match_match_id_seq'::regclass),
  team1_id text NOT NULL,
  team2_id text NOT NULL,
  matchday integer NOT NULL,
  stage character varying NOT NULL,
  date date NOT NULL,
  team1_score integer,
  team2_score integer,
  kickoff timestamp with time zone,
  CONSTRAINT match_pkey PRIMARY KEY (match_id),
  CONSTRAINT fk_match_team1 FOREIGN KEY (team1_id) REFERENCES public.team(team_id),
  CONSTRAINT fk_match_team2 FOREIGN KEY (team2_id) REFERENCES public.team(team_id)
);
CREATE TABLE public.playerstat (
  stat_id integer NOT NULL DEFAULT nextval('playerstat_stat_id_seq'::regclass),
  player_id integer NOT NULL,
  match_id integer NOT NULL,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  minutes_played integer DEFAULT 0,
  yellow_cards integer DEFAULT 0,
  score numeric DEFAULT 0,
  clean_sheet integer DEFAULT 0,
  red_cards integer DEFAULT 0,
  CONSTRAINT playerstat_pkey PRIMARY KEY (stat_id),
  CONSTRAINT fk_stat_player FOREIGN KEY (player_id) REFERENCES public.player(player_id),
  CONSTRAINT fk_stat_match FOREIGN KEY (match_id) REFERENCES public.match(match_id)
);
CREATE TABLE public.squad (
  squad_id integer NOT NULL DEFAULT nextval('squad_squad_id_seq'::regclass),
  user_id integer NOT NULL,
  matchday integer NOT NULL,
  budget_used numeric NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT squad_pkey PRIMARY KEY (squad_id),
  CONSTRAINT fk_squad_user FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.squadplayer (
  squadplayer_id integer NOT NULL DEFAULT nextval('squadplayer_squadplayer_id_seq'::regclass),
  squad_id integer NOT NULL,
  player_id integer NOT NULL,
  CONSTRAINT squadplayer_pkey PRIMARY KEY (squadplayer_id),
  CONSTRAINT fk_sp_squad FOREIGN KEY (squad_id) REFERENCES public.squad(squad_id),
  CONSTRAINT fk_sp_player FOREIGN KEY (player_id) REFERENCES public.player(player_id)
);
CREATE TABLE public.transfers (
  transfer_id integer NOT NULL DEFAULT nextval('transfers_transfer_id_seq'::regclass),
  user_id integer NOT NULL,
  player_in_id integer NOT NULL,
  player_out_id integer NOT NULL,
  matchday integer NOT NULL,
  CONSTRAINT transfers_pkey PRIMARY KEY (transfer_id),
  CONSTRAINT fk_transfer_user FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT fk_transfer_player_in FOREIGN KEY (player_in_id) REFERENCES public.player(player_id),
  CONSTRAINT fk_transfer_player_out FOREIGN KEY (player_out_id) REFERENCES public.player(player_id)
);