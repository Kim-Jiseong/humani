-- ⚠️⚠️ DEV ONLY — 전체 유저의 모든 실험 데이터 초기화 (Supabase SQL editor)
-- 모든 참가자의 참가자/시도/사후설문/제시로그 + 시도에 연결된 채팅을 삭제하고
-- 참가 순번(유형 배정 카운터)을 1로 되돌립니다. 실제 모집 시작 전 "완전 초기화"용.
-- 보존되는 것: scenario_words(참조 어휘집), 스키마, auth.users(로그인 계정).
-- 운영 데이터에는 절대 실행하지 마세요.

-- 1) 모든 실험 시도에 연결된 채팅 삭제 (messages는 ON DELETE CASCADE로 함께 삭제).
--    experiment_trials를 지우기 전에 chat_id를 참조해야 하므로 가장 먼저.
delete from public.chats
where id in (
  select chat_id from public.experiment_trials where chat_id is not null
);

-- 2) 실험 테이블 전체 삭제 (서로 FK 없음; auth.users만 참조).
delete from public.experiment_suggestions;
delete from public.experiment_survey_responses;
delete from public.experiment_trials;
delete from public.experiment_participants;

-- 3) 유형 배정 순번을 1로 초기화 (다음 첫 참가자 = seq 1 = 유형1).
alter sequence public.experiment_participant_seq restart with 1;

-- (선택) 실험과 무관한 자유 채팅까지 모두 지우려면 아래 두 줄의 주석을 해제하세요.
--   ⚠️ 연구자 본인의 기존 일반 대화도 모두 삭제됩니다.
-- delete from public.messages;
-- delete from public.chats;

-- 확인 (모두 0 이어야 함)
select
  (select count(*) from public.experiment_participants)      as participants,
  (select count(*) from public.experiment_trials)            as trials,
  (select count(*) from public.experiment_survey_responses)  as survey_responses,
  (select count(*) from public.experiment_suggestions)       as suggestions;
