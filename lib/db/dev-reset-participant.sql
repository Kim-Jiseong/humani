-- ⚠️ DEV ONLY — 실험 데이터 초기화 (Supabase SQL editor에서 실행)
-- 대상: prime@thermit.io 계정의 실험 데이터만. 다른 사용자/일반 채팅에는 영향 없음.
-- (참가자가 1명일 때를 가정한 테스트용 스크립트입니다. 운영 데이터에는 실행 금지.)

-- 1) 이 사용자의 실험 trial이 사용하던 채팅 삭제 (messages는 ON DELETE CASCADE로 함께 삭제).
--    experiment_trials를 지우기 전에 chat_id를 조회해야 하므로 가장 먼저 실행.
delete from public.chats
where user_id = (select id from auth.users where email = 'prime@thermit.io')
  and id in (
    select chat_id
    from public.experiment_trials
    where user_id = (select id from auth.users where email = 'prime@thermit.io')
      and chat_id is not null
  );

-- 2) 실험 응답 → 시도 → 참가자 순으로 삭제
delete from public.experiment_survey_responses
where user_id = (select id from auth.users where email = 'prime@thermit.io');

delete from public.experiment_trials
where user_id = (select id from auth.users where email = 'prime@thermit.io');

delete from public.experiment_participants
where user_id = (select id from auth.users where email = 'prime@thermit.io');

-- 3) (선택) 다음 참가를 "유형1"부터 다시 시작하려면 순번 초기화.
--    experiment_participant_seq는 전역 카운터라, 참가자가 prime 1명뿐일 때만 권장.
--    주석을 풀고 함께 실행하세요.
-- alter sequence public.experiment_participant_seq restart with 1;

-- 확인 (모두 0 이어야 함)
select
  (select count(*) from public.experiment_participants
     where user_id = (select id from auth.users where email = 'prime@thermit.io')) as participants,
  (select count(*) from public.experiment_trials
     where user_id = (select id from auth.users where email = 'prime@thermit.io')) as trials,
  (select count(*) from public.experiment_survey_responses
     where user_id = (select id from auth.users where email = 'prime@thermit.io')) as survey_responses;
