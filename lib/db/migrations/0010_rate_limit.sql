-- ============================================================================
-- Contador de requisicoes por origem, para as rotas de API.
--
-- POR QUE NO BANCO E NAO NA MEMORIA: cada requisicao da Vercel pode cair numa
-- instancia diferente. Um contador em memoria conta so o que passou por aquele
-- processo, entao dez instancias multiplicam o limite por dez — e o numero
-- configurado vira ficcao. O contador precisa ser um so, e o unico lugar
-- compartilhado que este projeto ja tem e o Postgres.
--
-- O QUE E `bucket`: um HMAC do IP com a chave de servidor, junto do nome da
-- rota e do tamanho da janela. O IP em si NUNCA e gravado — ele e dado pessoal
-- sob a LGPD, e para contar requisicao basta saber que duas vieram do mesmo
-- lugar, nao de onde vieram.
--
-- A tabela e do servidor e de mais ninguem: RLS ligada sem nenhuma policy, o
-- que fecha para `anon` e `authenticated`, e a funcao so pode ser executada
-- por `service_role`.
-- ============================================================================

begin;

create table if not exists public.rate_limit_hits (
  bucket     text primary key,
  contagem   integer not null default 0,
  expira_em  timestamptz not null
);

create index if not exists rate_limit_hits_expira_em_idx
  on public.rate_limit_hits (expira_em);

alter table public.rate_limit_hits enable row level security;
revoke all on table public.rate_limit_hits from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Conta uma requisicao e diz se ela passa.
--
-- ATOMICA DE PROPOSITO. Ler-decidir-escrever em tres viagens deixaria uma
-- janela em que duas requisicoes simultaneas leem o mesmo numero e ambas
-- passam — que e exatamente o caso que um limitador existe para cobrir. O
-- `insert ... on conflict do update` resolve tudo numa instrucao, sob o lock
-- da propria linha.
--
-- Janela fixa, nao deslizante: quando `expira_em` passou, a contagem volta a 1
-- e uma janela nova comeca. E menos preciso na virada e muito mais barato —
-- para o problema aqui, que e conter script, a diferenca nao aparece.
-- ----------------------------------------------------------------------------
create or replace function public.consumir_rate_limit(
  p_bucket           text,
  p_maximo           integer,
  p_janela_segundos  integer
)
returns table (permitido boolean, restante integer, expira_em timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contagem integer;
  v_expira   timestamptz;
begin
  insert into public.rate_limit_hits as r (bucket, contagem, expira_em)
  values (p_bucket, 1, now() + make_interval(secs => p_janela_segundos))
  on conflict (bucket) do update
    set contagem  = case when r.expira_em <= now() then 1
                         else r.contagem + 1 end,
        expira_em = case when r.expira_em <= now()
                         then now() + make_interval(secs => p_janela_segundos)
                         else r.expira_em end
  returning r.contagem, r.expira_em into v_contagem, v_expira;

  -- Limpeza oportunista: uma chamada em cem varre o que ja morreu. Sem isto a
  -- tabela cresceria para sempre com linhas que ninguem mais le. Um cron seria
  -- mais elegante e uma peca a mais para manter.
  if random() < 0.01 then
    delete from public.rate_limit_hits where expira_em < now() - interval '1 hour';
  end if;

  return query
    select v_contagem <= p_maximo,
           greatest(p_maximo - v_contagem, 0),
           v_expira;
end;
$$;

revoke all on function public.consumir_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consumir_rate_limit(text, integer, integer)
  to service_role;

commit;
