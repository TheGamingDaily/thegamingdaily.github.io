/* Form — offline, dependency-free personal workout log.
   All records remain in this site's localStorage unless explicitly exported. */
(() => {
  'use strict';
  const STORAGE_KEY = 'form-calisthenics-data-v1';
  const SCHEMA_VERSION = 1;
  const PLAN = {
    id: 'upper-abs-2026-final', version: 2, title: 'Upper Body + Abs',
    schedule: 'Wednesday, Friday and Sunday, 5:00–6:00 PM. Football Monday at 9:00 PM; Tuesday, Thursday and Saturday are recovery days from this workout.',
    restBetweenSessions: 'Three nonconsecutive sessions weekly. Return gradually after a training break; adjust if recovery or football performance suffers.',
    warmupMinutes: '5–8 minutes',
    warmup: ['Arm circles and shoulder rotations', 'Wrist mobility', 'Gentle torso rotations', 'One easy set of push-ups', 'Light dynamic movement'],
    cooldown: 'Cool down briefly. No specific cooldown exercises or duration were prescribed.',
    restUpperSets: '60–90 seconds', restUpperExercises: '90–120 seconds', restAbsRounds: '60–90 seconds',
    progression: 'Fixed working targets, not a universal optimum. Record actual results even when below target. When these feel easy with good technique, use a slightly harder variation; do not force extra repetitions.',
    safety: 'Prioritize controlled technique and recovery. Stop an exercise if it causes joint pain or unusual discomfort; seek qualified guidance rather than pushing through.',
    exercises: [
      {id:'pushups',name:'Standard Push-Ups',group:'upper',sets:2,kind:'reps',min:15,max:15,muscles:'Chest, triceps, shoulders',cue:'Maintain a straight body and use controlled movement.'},
      {id:'rows',name:'Seated Towel Isometric Rows',group:'upper',sets:3,kind:'seconds',min:25,max:25,muscles:'Back, biceps',cue:'Sit with knees slightly bent and a towel looped around your feet. Pull your elbows backward while your legs resist. Hold steadily without jerking.'},
      {id:'pike',name:'Pike Push-Ups',group:'upper',sets:2,kind:'reps',min:10,max:10,muscles:'Shoulders, triceps',cue:'Keep your hips raised and lower yourself slowly.'},
      {id:'snow',name:'Reverse Snow Angels',group:'upper',sets:2,kind:'reps',min:12,max:12,muscles:'Upper-back control, rear shoulders',cue:'Lie face down and move your arms slowly from overhead toward your hips, without excessively arching your back.'},
      {id:'decline',name:'Decline Push-Ups',group:'upper',sets:2,kind:'reps',min:10,max:10,muscles:'Chest, shoulders, triceps',cue:'Use a low, stable surface for your feet. Move with control.'},
      {id:'curls',name:'Towel Biceps Curls',group:'upper',sets:2,kind:'reps',min:15,max:15,muscles:'Biceps',cue:'Use the towel technique with consistent resistance throughout each repetition.'},
      {id:'crunches',name:'Floor Crunches',group:'abs',sets:3,kind:'reps',min:12,max:12,muscles:'Abdominal strength',cue:'Use controlled abdominal flexion; avoid pulling on your neck.'},
      {id:'raises',name:'Lying Leg-Hip Raises',group:'abs',sets:3,kind:'reps',min:12,max:12,muscles:'Abdominals, hip flexors',cue:'Lift your hips gently, avoiding excessive lower-back arching.'}
    ],
    absInstructions: 'Three rounds. Do Floor Crunches and then Lying Leg-Hip Raises consecutively; rest 60–90 seconds between rounds.',
    context: 'Calisthenics: Wednesday, Friday, Sunday 5–6 PM. Football: Monday 9 PM. Recover on Tuesday, Thursday and Saturday from this strength workout; football remains a separate activity.'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const main = $('#main-content');
  const clone = value => JSON.parse(JSON.stringify(value));
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLocal = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today = () => dateLocal(new Date());
  const asDate = s => new Date(`${s}T12:00:00`);
  const dayDisplay = s => {const d=asDate(s);return Number.isNaN(+d)?s:new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(d);};
  const validDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(+asDate(s)) && dateLocal(asDate(s))===s;
  const isObj = x => x !== null && typeof x==='object' && !Array.isArray(x);
  const validStr = (x,max=3000) => typeof x==='string' && x.length<=max;
  const validNum = (x,max=10000) => Number.isInteger(x)&&x>=0&&x<=max;
  const isISO = x => x===null || (typeof x==='string' && x.length<=40 && !Number.isNaN(Date.parse(x)));
  const target = ex => `${ex.min===ex.max?ex.min:`${ex.min}–${ex.max}`} ${ex.kind==='seconds'?'sec':'reps'}`;
  const completeCount = session => Object.values(session.sets).reduce((t,arr)=>t+arr.filter(r=>r.done).length,0);
  const totalCount = session => Object.values(session.sets).reduce((t,arr)=>t+arr.length,0);
  const numFmt = n => new Intl.NumberFormat().format(n);
  const defaultState = () => ({schemaVersion:SCHEMA_VERSION,program:clone(PLAN),sessions:[],prefs:{}});

  function validateProgram(p) {
    if(!isObj(p)||!validStr(p.id,100)||!validNum(p.version,10000)||!validStr(p.title,120)||!Array.isArray(p.exercises)||p.exercises.length<1||p.exercises.length>40) return false;
    for(const k of ['schedule','restBetweenSessions','warmupMinutes','cooldown','restUpperSets','restUpperExercises','restAbsRounds','progression','safety','absInstructions','context']) if(!validStr(p[k],3000)) return false;
    if(!Array.isArray(p.warmup)||p.warmup.length>30||!p.warmup.every(x=>validStr(x,500)))return false;
    const ids=new Set();
    for(const ex of p.exercises){
      if(!isObj(ex)||!validStr(ex.id,70)||!ex.id||ids.has(ex.id)||!validStr(ex.name,150)||!['upper','abs'].includes(ex.group)||!validNum(ex.sets,50)||ex.sets<1||!['reps','seconds'].includes(ex.kind)||!validNum(ex.min,10000)||!validNum(ex.max,10000)||ex.min>ex.max||!validStr(ex.muscles,500)||!validStr(ex.cue,2000))return false;
      ids.add(ex.id);
    }
    return true;
  }
  function validateSession(s) {
    if(!isObj(s)||!validStr(s.id,130)||!s.id||!validDate(s.date)||!['active','completed'].includes(s.status)||typeof s.startedAt!=='string'||!isISO(s.startedAt)||!isISO(s.finishedAt)||!isObj(s.programSnapshot)||!validateProgram(s.programSnapshot)||!validStr(s.sessionNotes,5000)||!isObj(s.sets)||!isObj(s.exerciseNotes))return false;
    const exes=s.programSnapshot.exercises;
    if(Object.keys(s.sets).length!==exes.length || Object.keys(s.exerciseNotes).length!==exes.length)return false;
    for(const ex of exes){
      const records=s.sets[ex.id];
      if(!Array.isArray(records)||records.length!==ex.sets||!validStr(s.exerciseNotes[ex.id],3000))return false;
      for(const r of records){if(!isObj(r)||typeof r.done!=='boolean'||!(r.reps===null||validNum(r.reps,10000))||!(r.seconds===null||validNum(r.seconds,36000))||!validStr(r.resistance,150))return false;}
    }
    return true;
  }
  function validateData(d) {
    if(!isObj(d)||d.schemaVersion!==1||!validateProgram(d.program)||!Array.isArray(d.sessions)||d.sessions.length>20000||!isObj(d.prefs))return false;
    if(d.sessions.some(s=>!validateSession(s)))return false;
    if(new Set(d.sessions.map(s=>s.id)).size!==d.sessions.length)return false;
    return true;
  }
  function normalizeLegacy(raw){
    if(!isObj(raw))return raw;
    // Explicit, lossless upgrade for a previous draft missing only schema metadata.
    if(raw.schemaVersion===undefined && Array.isArray(raw.sessions) && raw.program && isObj(raw.prefs))return {...raw,schemaVersion:1};
    return raw;
  }
  let storageLocked=false, storageError='', state;
  function tryLoad(){
    try {
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw===null)return defaultState();
      const parsed=normalizeLegacy(JSON.parse(raw));
      if(!validateData(parsed))throw new Error('Existing saved data failed validation.');
      return parsed;
    }catch(error){storageLocked=true;storageError=`Stored records could not be safely read: ${error.message}. They have NOT been overwritten.`;return defaultState();}
  }
  state=tryLoad();
  let currentTab='dashboard';
  let selectedSessionId=null;
  let selectedHistoryId=null;
  let incomingBackup=null;
  let modalOpener=null;
  let timerEnd=0, timerInterval=null, timerFinished=false;
  let toastTimeout=null;
  const statusEl=$('#save-indicator');
  // Upgrade the built-in plan without rewriting any recorded workout snapshots.
  // Keep the same storage key and data schema so prior records remain available.
  if(!storageLocked && state.program.id === PLAN.id && state.program.version < PLAN.version){
    const previousProgram=state.program;
    state.program=clone(PLAN);
    if(!save())state.program=previousProgram;
  }
  // Recovery of an older backup should also show today's built-in program.
  function applyBuiltInUpgrade(){
    if(state.program.id === PLAN.id && state.program.version < PLAN.version){
      state.program=clone(PLAN);
    }
  }

  const lastDate = ()=>state.sessions.filter(s=>s.status==='completed').slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
  const activeSession=()=>state.sessions.find(s=>s.status==='active');
  const selectedSession=()=>state.sessions.find(s=>s.id===selectedSessionId);

  function updateStatus(success=true, message='Saved locally'){
    statusEl.textContent=message;statusEl.classList.toggle('error',!success);
  }
  function save(){
    if(storageLocked){updateStatus(false,'Storage locked');return false;}
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));updateStatus(true);return true;}
    catch(e){storageError=`Automatic saving failed (${e.name||'storage error'}). Export your data and check browser storage settings.`;updateStatus(false,'Not saved');showToast('Saving failed. Use Export in Settings & data.',true);return false;}
  }
  function toast(message,error=false){showToast(message,error);}
  function showToast(message,error=false){const region=$('#alert-region');region.innerHTML=`<div class="toast ${error?'error':''}">${escapeHTML(message)}</div>`;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{region.replaceChildren();},4200);}
  function newId(){return `s_${typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'_'+Math.random().toString(36).slice(2)}`;}
  function newSession(){
    const sets={},exerciseNotes={};
    for(const e of state.program.exercises){sets[e.id]=Array.from({length:e.sets},()=>({done:false,reps:null,seconds:null,resistance:''}));exerciseNotes[e.id]='';}
    return {id:newId(),date:today(),status:'active',startedAt:new Date().toISOString(),finishedAt:null,programSnapshot:clone(state.program),sets,exerciseNotes,sessionNotes:''};
  }
  function nav(tab){
    if(!['dashboard','workout','history','progress','guide','settings'].includes(tab))return;
    currentTab=tab;
    if(tab==='workout' && !selectedSessionId && activeSession()) selectedSessionId=activeSession().id;
    render();window.scrollTo({top:0,behavior:'auto'});
  }
  function shellTitle(title,subtitle,button=''){
    return `<div class="page-top"><div><h1>${escapeHTML(title)}</h1>${subtitle?`<p>${escapeHTML(subtitle)}</p>`:''}</div>${button?`<div class="btn-row">${button}</div>`:''}</div>`;
  }
  function statusNotice(){
    if(storageLocked)return `<div class="notice danger-notice" role="alert"><strong>Storage recovery mode.</strong> ${escapeHTML(storageError)} New entries are not saved until you address this in Settings & data. <button class="inline-button" data-nav="settings">Recovery options</button></div>`;
    if(storageError)return `<div class="notice danger-notice" role="alert">${escapeHTML(storageError)} <button class="inline-button" data-nav="settings">Back up</button></div>`;
    return '';
  }
  function render(){
    document.querySelectorAll('[data-nav]').forEach(el=>{let active=el.dataset.nav===currentTab;el.classList.toggle('active',active);if(el.matches('.nav-item')){if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}});
    $('#page-crumb').textContent={dashboard:'Dashboard',workout:'My workout',history:'History',progress:'Progress',guide:'Exercise guide',settings:'Settings & data'}[currentTab];
    const contents={dashboard:renderDashboard,workout:renderWorkout,history:renderHistory,progress:renderProgress,guide:renderGuide,settings:renderSettings};
    main.innerHTML=statusNotice()+contents[currentTab]();
    updateTimerUI();
  }
  function completedSessions(){return state.sessions.filter(s=>s.status==='completed').sort((a,b)=>b.date.localeCompare(a.date)||b.startedAt.localeCompare(a.startedAt));}
  function sessionsSince(days){const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);return completedSessions().filter(s=>asDate(s.date)>=start);}
  function buttonForWorkout(){const active=activeSession();return active?`<button class="btn btn-light" data-action="resume" type="button">Resume workout</button>`:`<button class="btn btn-light" type="button" data-action="start" ${storageLocked?'disabled':''}>Start workout</button>`;}
  function renderDashboard(){
    const done=completedSessions(),active=activeSession(),recent=done.slice(0,3),last=lastDate();
    const days=[['Mon','Football','21:00'],['Tue','Recovery',''],['Wed','Upper + Abs','17:00'],['Thu','Recovery',''],['Fri','Upper + Abs','17:00'],['Sat','Recovery',''],['Sun','Upper + Abs','17:00']];
    const todayIndex=(new Date().getDay()+6)%7;
    return shellTitle('Overview','')+
      `<section class="hero"><div><div class="eyebrow">${active?'IN PROGRESS':'YOUR ROUTINE'}</div><h2>${escapeHTML(state.program.title)}</h2><p>Wed · Fri · Sun  /  17:00–18:00</p>${buttonForWorkout()}</div><div class="hero-side"><div class="hero-big">19</div><span>sets / session</span></div></section>
       <div class="cards three stat-grid"><div class="panel stat-box"><div class="mini-label">Sessions</div><div class="stat-number">${done.length}</div></div><div class="panel stat-box"><div class="mini-label">Last 28 days</div><div class="stat-number">${sessionsSince(28).length}</div></div><div class="panel stat-box"><div class="mini-label">Most recent</div><div class="stat-number" style="font-size:21px">${last?escapeHTML(dayDisplay(last.date)):'—'}</div></div></div>
       <div class="cards two" style="margin-top:16px"><section class="panel"><h2>This week</h2><div class="week-schedule">${days.map(([day,act,t],i)=>`<div class="week-day ${i===todayIndex?'today':''} ${act==='Recovery'?'recovery':''}"><span class="week-short">${day}</span><strong>${act}</strong><span class="week-clock">${t||'—'}</span></div>`).join('')}</div></section><section class="panel"><div class="section-header compact-header"><h2>Recent workouts</h2><button class="inline-button small" data-nav="history">View all</button></div>${recent.length?`<div class="activity-list">${recent.map(s=>`<div class="activity-row"><div><strong>${escapeHTML(dayDisplay(s.date))}</strong><div class="small muted">${completeCount(s)}/${totalCount(s)} sets</div></div><button class="btn btn-secondary small" data-action="review" data-id="${escapeHTML(s.id)}">View</button></div>`).join('')}</div>`:emptyMarkup('No sessions yet','')}</section></div>`;
  }
  function emptyMarkup(title,subtitle){return `<div class="empty"><div class="empty-icon" aria-hidden="true">◷</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(subtitle)}</p></div>`;}
  function renderPreview(){
    const p=state.program,upper=p.exercises.filter(e=>e.group==='upper'),abs=p.exercises.filter(e=>e.group==='abs');
    return shellTitle('My workout','Wed · Fri · Sun, 17:00–18:00',`<button class="btn btn-primary" type="button" data-action="start" ${storageLocked?'disabled':''}>Start workout</button>`)+
      `<section class="panel"><details class="compact-details"><summary>Warm-up · ${escapeHTML(p.warmupMinutes)}</summary><p>${escapeHTML(p.warmup.join(' · '))}</p></details></section>
       <div class="section-header"><h2>Upper body</h2><span class="pill">${escapeHTML(p.restUpperSets)} rest</span></div><div class="exercise-stack">${upper.map((e,i)=>`<article class="panel compact"><div class="exercise-info"><span class="exercise-num">${i+1}</span><div><h3 style="margin:0">${escapeHTML(e.name)}</h3><div class="small muted">${e.sets} × ${escapeHTML(target(e))}</div></div></div><details class="cue-details"><summary>Technique</summary><p>${escapeHTML(e.cue)}</p></details></article>`).join('')}</div>
       <p class="footnotes">${escapeHTML(p.restUpperSets)} between sets · ${escapeHTML(p.restUpperExercises)} between exercises</p>
       <div class="section-header"><h2>Abs · 3 rounds</h2><span class="pill">${escapeHTML(p.restAbsRounds)} rest/round</span></div><section class="panel">${abs.map((e,i)=>`<div class="schedule-row"><strong>${i+7}. ${escapeHTML(e.name)}</strong><span>${escapeHTML(target(e))}</span></div>`).join('')}<p class="hint">Back-to-back each round. Rest after both.</p><details class="compact-details"><summary>Cooldown & guidance</summary><p>${escapeHTML(p.cooldown)} ${escapeHTML(p.safety)}</p></details></section>`;
  }
  function renderWorkout(){
    const s=selectedSession();if(!s){return renderPreview();}
    const p=s.programSnapshot,done=completeCount(s),total=totalCount(s),percent=Math.round(100*done/total),finished=s.status==='completed';
    const upper=p.exercises.filter(e=>e.group==='upper'),abs=p.exercises.filter(e=>e.group==='abs');
    const upperHTML=upper.map((e,i)=>renderExercise(e,s,i)).join('');
    const absHTML=Array.from({length:3},(_,i)=>renderAbsRound(i,s,abs)).join('');
    return shellTitle(finished?'Edit session':'Workout','',`<button class="btn btn-outline" data-action="exit-workout">${finished?'Back to history':'Back to dashboard'}</button>`)+
    `<div class="session-summary panel"><div class="session-status"><div><span class="pill ${finished?'green':'gold'}">${finished?'Finished':'In progress'}</span> <span class="small muted">${escapeHTML(dayDisplay(s.date))}</span></div><strong id="set-count-label">${done} / ${total} sets completed</strong></div><div class="progress-track" role="progressbar" aria-label="Completed sets" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><div class="progress-fill" style="width:${percent}%"></div></div><div class="input-row" style="margin-top:15px"><label for="session-date" class="field-label" style="margin:0">Session date</label><input type="date" id="session-date" data-session-field="date" value="${escapeHTML(s.date)}" aria-label="Workout date"/></div></div>
    <div class="session-grid"><div class="exercise-stack"><section class="panel compact"><h3>Warm up · ${escapeHTML(p.warmupMinutes)}</h3><p class="small muted" style="margin:0">${escapeHTML(p.warmup.join(' · '))}.</p></section><div class="section-kicker"><span>01 / UPPER BODY</span></div>${upperHTML}<p class="footnotes">Rest ${escapeHTML(p.restUpperSets)} between sets and ${escapeHTML(p.restUpperExercises)} between exercises.</p><div class="section-kicker"><span>02 / ABS SUPERSET · 3 ROUNDS</span></div><p class="small muted">${escapeHTML(p.absInstructions)}</p>${absHTML}<section class="panel"><h3>Wrap up</h3><p class="small muted">${escapeHTML(p.cooldown)}</p><label class="field-label" for="session-notes">Session notes</label><textarea id="session-notes" data-session-field="sessionNotes" class="text-field note-input" maxlength="5000" placeholder="Technique, how the workout felt, or anything to remember…">${escapeHTML(s.sessionNotes)}</textarea><div class="btn-row" style="margin-top:16px">${finished?`<span class="pill green">Session finished · edits save automatically</span><button class="btn btn-outline" data-action="exit-workout">History</button>`:`<button class="btn btn-primary" data-action="finish">Finish & save workout</button><button class="btn btn-outline" data-action="exit-workout">Save & leave unfinished</button>`}</div></section></div><aside><section class="panel timercard timer-panel"><div class="mini-label">REST TIMER</div><div class="timer-num" id="timer-display">01:00</div><div class="timer-presets"><button class="btn btn-secondary small" data-action="timer-start" data-secs="60">60s</button><button class="btn btn-secondary small" data-action="timer-start" data-secs="90">90s</button><button class="btn btn-secondary small" data-action="timer-start" data-secs="120">120s</button></div><div class="btn-row" style="justify-content:center;margin-top:10px"><button class="btn btn-outline small" data-action="timer-stop">Stop / reset</button></div><div class="timer-note" id="timer-message" role="status" aria-live="polite"></div></section></aside></div>`;
  }
  function renderExercise(ex,s,i){
    const arr=s.sets[ex.id],done=arr.filter(x=>x.done).length;
    return `<article class="panel exercise-card ${done===ex.sets?'is-done':''}" data-ex-card="${escapeHTML(ex.id)}"><div class="exercise-head"><div class="exercise-info"><span class="exercise-num">${i+1}</span><div><div class="exercise-name">${escapeHTML(ex.name)}</div><div class="small muted">${ex.sets} × ${escapeHTML(target(ex))}</div></div></div><span class="pill ${done===ex.sets?'green':''}" data-ex-count="${escapeHTML(ex.id)}">${done}/${ex.sets} done</span></div><div class="exercise-content"><p class="exercise-details">${escapeHTML(ex.cue)}</p>${renderSetHeaders(ex)}${arr.map((r,j)=>renderSetLine(ex,r,j)).join('')}<div class="exercise-actions"><label class="small muted" style="flex:1;min-width:170px" for="note-${escapeHTML(ex.id)}">Exercise notes</label><button class="btn btn-secondary small" data-action="mark-exercise" data-ex="${escapeHTML(ex.id)}" type="button">${done===ex.sets?'Unmark all sets':'Mark all sets done'}</button></div><textarea id="note-${escapeHTML(ex.id)}" class="text-field note-input" rows="2" maxlength="3000" data-ex-note="${escapeHTML(ex.id)}" placeholder="Notes (optional)">${escapeHTML(s.exerciseNotes[ex.id])}</textarea></div></article>`;
  }
  function renderSetHeaders(ex){return `<div class="set-labels"><span>Set</span><span>Target</span><span>Actual ${ex.kind==='seconds'?'sec':'reps'}</span><span class="res-label">Resistance (optional)</span><span>Done</span></div>`;}
  function renderSetLine(ex,r,j){
    const key=`data-set-ex="${escapeHTML(ex.id)}" data-set-i="${j}"`;
    const type=ex.kind==='seconds'?'seconds':'reps';
    return `<div class="set-line"><span>${j+1}</span><span class="set-target">${escapeHTML(target(ex))}</span><input aria-label="${escapeHTML(ex.name)}, set ${j+1}, actual ${ex.kind==='seconds'?'seconds':'repetitions'}" inputmode="numeric" type="number" min="0" max="${type==='seconds'?'36000':'10000'}" step="1" placeholder="—" value="${r[type]===null?'':r[type]}" data-set-field="${type}" ${key}><input class="res-field" aria-label="${escapeHTML(ex.name)}, set ${j+1}, resistance or weight" type="text" maxlength="150" placeholder="Bodyweight" value="${escapeHTML(r.resistance)}" data-set-field="resistance" ${key}><label class="set-completed"><input type="checkbox" class="check-input" aria-label="${escapeHTML(ex.name)}, set ${j+1} completed" data-set-field="done" ${key} ${r.done?'checked':''}></label></div>`;
  }
  function renderAbsRound(i,s,abs){
    return `<article class="panel exercise-card" data-abs-round="${i}"><div class="exercise-head"><div><div class="mini-label">SUPERSET</div><div class="exercise-name">Round ${i+1} of 3</div></div><span class="pill">${i===2?'Final round':'Rest 60–90s afterward'}</span></div><div class="exercise-content">${abs.map((e,j)=>`<div style="margin-bottom:17px"><div class="exercise-info" style="margin-bottom:10px"><span class="exercise-num">${j+7}</span><div><strong>${escapeHTML(e.name)}</strong><div class="small muted">${escapeHTML(e.cue)}</div></div></div>${renderSetHeaders(e)}${renderSetLine(e,s.sets[e.id][i],i)}</div>`).join('')}${i===2?`<div class="divider"></div>${abs.map(e=>`<label class="field-label" for="note-${escapeHTML(e.id)}">${escapeHTML(e.name)} · notes</label><textarea id="note-${escapeHTML(e.id)}" data-ex-note="${escapeHTML(e.id)}" class="text-field note-input" rows="2" maxlength="3000" placeholder="Notes (optional)">${escapeHTML(s.exerciseNotes[e.id])}</textarea>`).join('')}<div class="btn-row" style="margin-top:13px">${abs.map(e=>`<button type="button" class="btn btn-secondary small" data-action="mark-exercise" data-ex="${escapeHTML(e.id)}">${s.sets[e.id].every(r=>r.done)?'Unmark':'Mark'} ${escapeHTML(e.name)} sets</button>`).join('')}</div>`:''}</div></article>`;
  }
  function renderHistory(){
    const sessions=state.sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.startedAt.localeCompare(a.startedAt));
    return shellTitle('History','')+(sessions.length?`<section class="panel"><div class="history-table-wrap"><table class="history-table"><thead><tr><th>Date</th><th>Status</th><th>Sets logged</th><th>Actions</th></tr></thead><tbody>${sessions.map(s=>`<tr><td><strong>${escapeHTML(dayDisplay(s.date))}</strong><div class="session-id">${escapeHTML(s.programSnapshot.title)}</div></td><td><span class="pill ${s.status==='completed'?'green':'gold'}">${s.status==='completed'?'Finished':'Unfinished'}</span></td><td>${completeCount(s)} / ${totalCount(s)}</td><td class="table-actions"><button class="btn btn-secondary small" data-action="review" data-id="${escapeHTML(s.id)}">Review</button> <button class="btn btn-outline small" data-action="edit-session" data-id="${escapeHTML(s.id)}">${s.status==='active'?'Resume':'Edit'}</button></td></tr>`).join('')}</tbody></table></div></section>`:emptyMarkup('No sessions recorded','Start a workout and your set-by-set results will appear here.'))+ (selectedHistoryId?renderHistoryDetail(state.sessions.find(s=>s.id===selectedHistoryId)):'');
  }
  function renderHistoryDetail(s){if(!s)return'';return `<section class="panel history-details" style="margin-top:17px"><div class="section-header" style="margin-top:0"><div><div class="eyebrow">SESSION DETAIL</div><h2>${escapeHTML(dayDisplay(s.date))}</h2></div><div class="btn-row"><button class="btn btn-outline small" data-action="edit-session" data-id="${escapeHTML(s.id)}">Edit results</button><button class="btn btn-danger small" data-action="delete-session" data-id="${escapeHTML(s.id)}">Delete session</button></div></div><p class="small muted">${escapeHTML(s.status==='completed'?'Finished workout':'Unfinished workout')} · ${completeCount(s)} of ${totalCount(s)} sets marked done</p><div class="history-table-wrap"><table class="result-table"><thead><tr><th>Exercise</th><th>Set</th><th>Target</th><th>Actual</th><th>Resistance</th><th>Done</th></tr></thead><tbody>${s.programSnapshot.exercises.flatMap(ex=>s.sets[ex.id].map((r,i)=>`<tr><td>${escapeHTML(ex.name)}</td><td>${i+1}</td><td>${escapeHTML(target(ex))}</td><td>${r[ex.kind]==null?'—':`${r[ex.kind]} ${ex.kind==='seconds'?'sec':'reps'}`}</td><td>${escapeHTML(r.resistance||'—')}</td><td>${r.done?'Yes':'No'}</td></tr>`)).join('')}</tbody></table></div>${s.sessionNotes?`<p><strong>Session notes:</strong> ${escapeHTML(s.sessionNotes)}</p>`:''}${s.programSnapshot.exercises.filter(ex=>s.exerciseNotes[ex.id]).map(ex=>`<p class="small"><strong>${escapeHTML(ex.name)}:</strong> ${escapeHTML(s.exerciseNotes[ex.id])}</p>`).join('')}</section>`;}
  function monday(date){const d=new Date(date);d.setHours(12,0,0,0);const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return d;}
  function renderProgress(){
    const sessions=completedSessions();const weeks=[];const thisMon=monday(new Date());
    for(let i=5;i>=0;i--){let start=new Date(thisMon);start.setDate(start.getDate()-7*i);let end=new Date(start);end.setDate(end.getDate()+7);weeks.push({start,end,label:new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(start),count:sessions.filter(s=>asDate(s.date)>=start&&asDate(s.date)<end).length});}
    const max=Math.max(2,...weeks.map(w=>w.count));
    const exRows=state.program.exercises.map(e=>{
      const matches=sessions.filter(s=>s.sets[e.id]&&s.programSnapshot.exercises.some(x=>x.id===e.id&&x.kind===e.kind));
      const logged=matches.map(s=>({date:s.date,values:s.sets[e.id].filter(r=>r.done&&r[e.kind]!==null).map(r=>r[e.kind]),resistances:s.sets[e.id].filter(r=>r.done&&r.resistance).map(r=>r.resistance)})).filter(x=>x.values.length);
      const first=logged.length?logged[logged.length-1]:null,last=logged[0]||null;
      const best=logged.flatMap(x=>x.values);return {e,first,last,best:best.length?Math.max(...best):null};
    });
    return shellTitle('Progress','')+
      `<div class="cards three"><div class="panel stat-box"><div class="mini-label">Completed sessions</div><div class="stat-number">${sessions.length}</div><div class="stat-label">Since you began logging</div></div><div class="panel stat-box"><div class="mini-label">Last 28 days</div><div class="stat-number">${sessionsSince(28).length}</div><div class="stat-label">Workouts completed</div></div><div class="panel stat-box"><div class="mini-label">Recorded sets</div><div class="stat-number">${sessions.reduce((a,s)=>a+completeCount(s),0)}</div><div class="stat-label">Across finished workouts</div></div></div>
      <section class="panel" style="margin-top:18px"><h2>Recent consistency</h2><p class="muted small">Completed sessions by week (Monday–Sunday). The current week may be unfinished.</p><div class="week-bars" aria-label="Completed sessions in the last six calendar weeks">${weeks.map((w,i)=>`<div class="week-bar"><span class="bar-value">${w.count}</span><div class="bar" style="height:${Math.max(5,Math.round(w.count/max*115))}px"></div><span class="bar-label">${escapeHTML(w.label)}</span></div>`).join('')}</div></section>
      <section class="panel" style="margin-top:18px"><h2>Exercise performance</h2><p class="muted small">First and most recent recorded per-set best, plus your highest recorded set. A dash means no actual result was entered.</p><div class="history-table-wrap"><table class="history-table"><thead><tr><th>Exercise</th><th>First logged</th><th>Most recent</th><th>Best recorded set</th></tr></thead><tbody>${exRows.map(({e,first,last,best})=>`<tr><td><strong>${escapeHTML(e.name)}</strong></td><td>${first?Math.max(...first.values):'—'}</td><td>${last?Math.max(...last.values):'—'}</td><td>${best===null?'—':`${best} ${e.kind==='seconds'?'sec':'reps'}`}</td></tr>`).join('')}</tbody></table></div><p class="hint">Numbers are actual logged results, not prescribed targets. Resistance entries remain in your session history; free-text loads aren't automatically compared.</p></section>`;
  }
  function renderGuide(){const p=state.program;return shellTitle('Exercise guide','Technique notes and program instructions from your agreed workout.')+
    `<section class="panel"><h2>How to follow your week</h2><p>${escapeHTML(p.schedule)} ${escapeHTML(p.restBetweenSessions)}</p><p class="small muted">${escapeHTML(p.context)}</p><div class="tip-grid"><div class="callout"><strong>Warm-up · ${escapeHTML(p.warmupMinutes)}</strong><ul class="list-bullets">${p.warmup.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul></div><div class="callout"><strong>Rest & progression</strong><p style="margin-top:8px">Upper sets: ${escapeHTML(p.restUpperSets)}. Between upper exercises: ${escapeHTML(p.restUpperExercises)}. Between ab rounds: ${escapeHTML(p.restAbsRounds)}.</p><p>${escapeHTML(p.progression)}</p></div></div></section>
    <div class="section-header"><h2>Upper-body exercises</h2></div><div class="guide-list">${p.exercises.filter(x=>x.group==='upper').map((ex,i)=>renderGuideEx(ex,i+1)).join('')}</div><div class="section-header"><h2>Abs · 3-round superset</h2></div><section class="panel" style="margin-bottom:13px"><p style="margin:0">${escapeHTML(p.absInstructions)}</p></section><div class="guide-list">${p.exercises.filter(x=>x.group==='abs').map((ex,i)=>renderGuideEx(ex,i+7)).join('')}</div><section class="panel" style="margin-top:20px"><h3>After the workout</h3><p>${escapeHTML(p.cooldown)}</p><p class="small muted">${escapeHTML(p.safety)} Your towel exercises provide some resistance, but a properly secured pull-up bar would eventually enable more dynamic pulling training.</p></section>`;}
  function renderGuideEx(e,i){return `<article class="panel guide-item"><div class="exercise-info"><span class="exercise-num">${i}</span><div><h3 style="margin:0">${escapeHTML(e.name)}</h3><div class="small muted">${e.sets} × ${escapeHTML(target(e))} · ${escapeHTML(e.muscles)}</div></div></div><p style="margin:11px 0 0">${escapeHTML(e.cue)}</p></article>`;}
  function renderSettings(){return shellTitle('Data','')+
    `<div class="settings-grid"><section class="panel"><div class="eyebrow">BACKUP</div><h2>Export your data</h2><p class="small muted">Downloads your program, every session, all set results, dates, exercise notes, and preferences as a JSON file.</p><button class="btn btn-primary" data-action="export">Export JSON backup</button><p class="hint">Export regularly and keep backups in a safe location separate from this browser.</p></section>
    <section class="panel"><div class="eyebrow">RESTORE</div><h2>Import a backup</h2><p class="small muted">Checks the file before changes. Merge skips existing session IDs; replace requires explicit confirmation.</p><label class="btn btn-outline" for="import-file" style="cursor:pointer">Choose JSON backup</label><input id="import-file" type="file" accept=".json,application/json" class="file-input" aria-label="Choose workout JSON backup"/><p class="hint">No records are changed just by selecting a file.</p></section>
    <section class="panel"><div class="eyebrow">STORAGE</div><h2>Where records live</h2><p class="small muted">Saved automatically in this site's browser localStorage.</p><ul class="list-bullets small"><li>Specific to this browser and site origin; does not sync across devices.</li><li>Clearing browser data may erase it; private browsing may not retain it.</li><li>Opening local HTML files directly can have inconsistent storage behavior.</li><li>For dependable use, serve the files from a stable <code>http://localhost</code> address or a trusted HTTPS static host.</li></ul><div class="muted-note">${storageLocked?'Recovery needed — original data is still held in browser storage.':storageError?'Saving error — export a backup and check storage settings.':'Storage appears available; it is not permanent or guaranteed.'}</div></section>
    <section class="panel"><div class="eyebrow">DANGER ZONE</div><h2>Remove saved records</h2><p class="small muted">Deletion requires confirmation and cannot be undone without a backup.</p>${storageLocked?`<button class="btn btn-outline" data-action="recover-raw">Download unreadable saved data</button><button class="btn btn-danger" style="margin-top:10px" data-action="recover-reset">Clear damaged storage & start fresh</button>`:`<button class="btn btn-danger" data-action="clear-history">Delete workout history</button>`}<p class="hint">You can also delete a single session from its History detail.</p></section></div>
    <section class="panel" style="margin-top:18px"><div class="eyebrow">PROGRAM INFORMATION</div><h2>Plan preserved</h2><p class="small muted">Wed / Fri / Sun at 17:00. Historic workouts keep their original targets when the plan changes.</p><div class="btn-row"><span class="pill">Program version ${state.program.version}</span><span class="pill">${state.sessions.length} saved session${state.sessions.length===1?'':'s'}</span><span class="pill">Local only</span></div></section>`;}

  function updateProgressInTracker(){
    const s=selectedSession();if(!s)return;const done=completeCount(s),total=totalCount(s);
    const lab=$('#set-count-label');if(lab)lab.textContent=`${done} / ${total} sets completed`;
    const bar=$('.session-summary [role="progressbar"]');if(bar){bar.setAttribute('aria-valuenow',String(done));const fill=$('.progress-fill',bar);if(fill)fill.style.width=`${Math.round(100*done/total)}%`;}
    for(const ex of s.programSnapshot.exercises.filter(e=>e.group==='upper')){
      const el=document.querySelector(`[data-ex-count="${CSS.escape(ex.id)}"]`);if(!el)continue;
      const count=s.sets[ex.id].filter(r=>r.done).length;
      el.textContent=`${count}/${ex.sets} done`;el.classList.toggle('green',count===ex.sets);
      const card=el.closest('.exercise-card');if(card)card.classList.toggle('is-done',count===ex.sets);
      const btn=card?.querySelector('[data-action="mark-exercise"]');if(btn)btn.textContent=count===ex.sets?'Unmark all sets':'Mark all sets done';
    }
    document.querySelectorAll('[data-action="mark-exercise"]').forEach(btn=>{const e=s.programSnapshot.exercises.find(x=>x.id===btn.dataset.ex);if(e?.group==='abs')btn.textContent=(s.sets[e.id].every(r=>r.done)?'Unmark':'Mark')+' '+e.name+' sets';});
  }
  function updateSetField(el){
    const s=selectedSession();if(!s||storageLocked)return;
    const ex=el.dataset.setEx,index=Number(el.dataset.setI),field=el.dataset.setField;
    if(!Object.prototype.hasOwnProperty.call(s.sets,ex)||!Number.isInteger(index)||index<0||index>=s.sets[ex].length||!['done','reps','seconds','resistance'].includes(field))return;
    const r=s.sets[ex][index];
    if(field==='done')r.done=el.checked;
    else if(field==='resistance')r.resistance=el.value.slice(0,150);
    else if(el.value.trim()==='')r[field]=null;
    else {const n=Number(el.value);if(!Number.isInteger(n)||n<0||n>(field==='seconds'?36000:10000)){el.setCustomValidity('Enter a valid non-negative whole number.');el.reportValidity();return;}el.setCustomValidity('');r[field]=n;}
    save();if(field==='done')updateProgressInTracker();
  }
  function finishWorkout(){const s=selectedSession();if(!s||s.status==='completed'||storageLocked)return;
    const missing=totalCount(s)-completeCount(s);
    if(missing>0&&!window.confirm(`${missing} set${missing===1?' is':'s are'} not marked complete. Finish this workout anyway? Blank actual results will remain blank.`))return;
    s.status='completed';s.finishedAt=new Date().toISOString();if(!save())return;
    selectedHistoryId=s.id;selectedSessionId=null;nav('history');toast('Workout finished and saved.');
  }
  function exportData(){
    const envelope={format:'form-calisthenics-backup',backupVersion:1,exportedAt:new Date().toISOString(),data:state};
    downloadJson(envelope,`form-workout-backup-${today()}.json`);toast('Backup downloaded.');
  }
  function downloadJson(obj,filename){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});downloadBlob(blob,filename);}
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function openModal(title,body,buttons){
    modalOpener=document.activeElement;
    const layer=$('#modal-layer');layer.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><h2 id="modal-heading">${escapeHTML(title)}</h2>${body}<div class="modal-actions">${buttons}</div></div></div>`;
    const first=$('.modal button');if(first)first.focus();
  }
  function closeModal(){const layer=$('#modal-layer');layer.replaceChildren();incomingBackup=null;modalOpener?.focus();modalOpener=null;}
  function confirmClear(){openModal('Delete all workout history?',`<p>This permanently deletes <strong>${state.sessions.length} session${state.sessions.length===1?'':'s'}</strong> from this browser. Your workout plan remains. Export a backup first if you may need the records.</p><label for="delete-phrase" class="field-label">Type DELETE to confirm</label><input id="delete-phrase" class="text-field" autocomplete="off" placeholder="DELETE">`,`<button class="btn btn-secondary" data-action="modal-close">Cancel</button><button class="btn btn-danger" data-action="confirm-clear" id="delete-confirm" disabled>Delete history</button>`);}
  async function readImport(input){
    if(!input.files?.length)return;
    const file=input.files[0];input.value='';
    if(file.size>15*1024*1024){toast('File exceeds the 15 MB import safety limit.',true);return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(!isObj(parsed)||parsed.format!=='form-calisthenics-backup'||parsed.backupVersion!==1||!validateData(parsed.data))throw new Error('File is not a valid Form v1 JSON backup.');
      incomingBackup=parsed.data;
      const present=new Set(state.sessions.map(s=>s.id));const duplicates=incomingBackup.sessions.filter(s=>present.has(s.id)).length;
      openModal('Import workout backup',`<p><strong>${incomingBackup.sessions.length}</strong> session${incomingBackup.sessions.length===1?'':'s'} found. <strong>${duplicates}</strong> match existing IDs.</p><p><strong>Merge:</strong> adds ${incomingBackup.sessions.length-duplicates} new sessions and keeps all existing sessions. <strong>Replace:</strong> replaces the entire program and record collection after another confirmation.</p><p class="small muted">${incomingBackup.program.id===state.program.id?'Program ID matches this app.':'The imported program differs from the current one; merging keeps your current program and preserves imported session snapshots.'}</p>`,`<button class="btn btn-secondary" data-action="modal-close">Cancel</button><button class="btn btn-outline" data-action="import-merge" ${storageLocked?'disabled':''}>Merge safely</button><button class="btn btn-danger" data-action="import-replace" ${storageLocked?'disabled':''}>Replace everything</button>`);
    }catch(e){toast(`Import rejected: ${e.message}`,true);}
  }
  function applyImport(replace){
    if(!incomingBackup||storageLocked)return;
    if(replace&&!window.confirm('Replace ALL existing workout records and the current stored program with this backup? Export a backup of your existing records first.'))return;
    const old=clone(state),oldids=new Set(state.sessions.map(s=>s.id));
    if(replace){state=clone(incomingBackup);applyBuiltInUpgrade();}
    else state.sessions.push(...clone(incomingBackup.sessions.filter(s=>!oldids.has(s.id))));
    if(!save()){state=old;toast('Import was not applied because storage could not save.',true);return;}
    const imported=replace?state.sessions.length:state.sessions.length-old.sessions.length;
    closeModal();selectedSessionId=null;selectedHistoryId=null;nav('history');toast(`${replace?'Restored':'Merged'} ${imported} session${imported===1?'':'s'}.`);
  }
  function timerFormat(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  function updateTimerUI(){const display=$('#timer-display'),message=$('#timer-message');if(!display)return;
    const remaining=timerEnd?Math.max(0,Math.ceil((timerEnd-Date.now())/1000)):60;
    display.textContent=timerFormat(remaining);
    if(timerEnd && remaining===0){timerEnd=0;clearInterval(timerInterval);timerInterval=null;timerFinished=true;}
    if(message)message.textContent=timerFinished?'Rest finished.':timerEnd?'Timer running…':'Choose a rest duration when needed.';
  }
  function startTimer(secs){timerFinished=false;timerEnd=Date.now()+secs*1000;clearInterval(timerInterval);updateTimerUI();timerInterval=setInterval(updateTimerUI,250);}
  function stopTimer(){timerEnd=0;timerFinished=false;clearInterval(timerInterval);timerInterval=null;updateTimerUI();}
  function recoverRaw(){try {const raw=localStorage.getItem(STORAGE_KEY);if(!raw)throw new Error('No raw data found.');downloadBlob(new Blob([raw],{type:'application/json'}),`form-unreadable-recovery-${today()}.json`);toast('Recovery copy downloaded.');}catch(e){toast(e.message,true);}}
  function resetLocked(){openModal('Clear damaged saved data?',`<p>The existing records could not be read. Download a raw recovery copy before clearing them. This action deletes that stored data.</p><label for="delete-phrase" class="field-label">Type DELETE to confirm</label><input id="delete-phrase" class="text-field" autocomplete="off" placeholder="DELETE">`,`<button class="btn btn-secondary" data-action="modal-close">Cancel</button><button class="btn btn-danger" id="delete-confirm" data-action="confirm-recover-reset" disabled>Clear damaged storage</button>`);}
  document.addEventListener('click',event=>{
    const navTarget=event.target.closest('[data-nav]');if(navTarget){if(navTarget.dataset.nav==='workout' && selectedSession()?.status==='completed')selectedSessionId=null;nav(navTarget.dataset.nav);return;}
    const b=event.target.closest('[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='start'){if(storageLocked)return;const existing=activeSession();if(existing){selectedSessionId=existing.id;toast('Resumed your unfinished workout.');}else {const s=newSession();state.sessions.push(s);if(!save()){state.sessions.pop();return;}selectedSessionId=s.id;}nav('workout');}
    else if(action==='resume'){if(activeSession()){selectedSessionId=activeSession().id;nav('workout');}}
    else if(action==='exit-workout'){const s=selectedSession();selectedSessionId=null;nav(s?.status==='completed'?'history':'dashboard');}
    else if(action==='mark-exercise'){const s=selectedSession();if(!s||storageLocked)return;const arr=s.sets[b.dataset.ex];if(!arr)return;const newDone=!arr.every(r=>r.done);arr.forEach(r=>r.done=newDone);document.querySelectorAll(`[data-set-field="done"][data-set-ex="${CSS.escape(b.dataset.ex)}"]`).forEach(box=>{box.checked=newDone;});save();updateProgressInTracker();}
    else if(action==='finish')finishWorkout();
    else if(action==='review'){selectedHistoryId=b.dataset.id;nav('history');setTimeout(()=>document.querySelector('.history-details')?.scrollIntoView({block:'nearest'}),0);}
    else if(action==='edit-session'){selectedSessionId=b.dataset.id;nav('workout');}
    else if(action==='delete-session'){const idx=state.sessions.findIndex(s=>s.id===b.dataset.id);if(idx<0||storageLocked)return;if(window.confirm(`Delete the workout recorded on ${dayDisplay(state.sessions[idx].date)}? This cannot be undone without a backup.`)){const removed=state.sessions.splice(idx,1)[0];if(!save()){state.sessions.splice(idx,0,removed);return;}selectedHistoryId=null;if(selectedSessionId===removed.id)selectedSessionId=null;render();toast('Session deleted.');}}
    else if(action==='timer-start')startTimer(Number(b.dataset.secs));
    else if(action==='timer-stop')stopTimer();
    else if(action==='export')exportData();
    else if(action==='modal-close')closeModal();
    else if(action==='import-merge')applyImport(false);
    else if(action==='import-replace')applyImport(true);
    else if(action==='clear-history')confirmClear();
    else if(action==='confirm-clear'){if($('#delete-phrase')?.value!=='DELETE')return;const original=state.sessions;state.sessions=[];if(!save()){state.sessions=original;return;}selectedSessionId=null;selectedHistoryId=null;closeModal();render();toast('Workout history deleted.');}
    else if(action==='recover-raw')recoverRaw();
    else if(action==='recover-reset')resetLocked();
    else if(action==='confirm-recover-reset'){if($('#delete-phrase')?.value!=='DELETE')return;try{localStorage.removeItem(STORAGE_KEY);storageLocked=false;storageError='';state=defaultState();if(!save())throw new Error('Unable to write fresh data.');closeModal();render();toast('Damaged storage cleared.');}catch(e){storageLocked=true;toast(`Unable to reset storage: ${e.message}`,true);}}
  });
  document.addEventListener('input',event=>{
    const el=event.target;if(el.id==='delete-phrase'){$('#delete-confirm').disabled=el.value!=='DELETE';return;}
    if(!el.dataset.setField&&!el.dataset.exNote&&!el.dataset.sessionField)return;
    if(el.dataset.setField){if(el.dataset.setField==='done')return;updateSetField(el);}
    else {const s=selectedSession();if(!s||storageLocked)return;
      if(el.dataset.exNote){if(s.exerciseNotes[el.dataset.exNote]===undefined)return;s.exerciseNotes[el.dataset.exNote]=el.value.slice(0,3000);}
      else if(el.dataset.sessionField==='sessionNotes')s.sessionNotes=el.value.slice(0,5000);
      else return;
      save();}
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='import-file'){readImport(el);return;}
    if(el.dataset.setField==='done'){updateSetField(el);return;}
    if(el.dataset.sessionField==='date'){
      if(!validDate(el.value)){toast('Enter a valid session date.',true);return;}
      const s=selectedSession();if(s&&!storageLocked){s.date=el.value;save();const shown=$('.session-summary .session-status .muted');if(shown)shown.textContent=dayDisplay(s.date);}
    }
  });
  document.addEventListener('keydown',event=>{
    const modal=$('.modal');if(!modal)return;
    if(event.key==='Escape'){closeModal();return;}
    if(event.key==='Tab'){
      const items=Array.from(modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)'));
      if(!items.length)return;const first=items[0],last=items[items.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  // A fresh installation writes a well-formed initial record to verify that storage works.
  if(!storageLocked){try{if(!localStorage.getItem(STORAGE_KEY))save();}catch(e){storageError='Browser storage is unavailable. Records cannot be saved until storage is enabled.';updateStatus(false,'Not saved');}}
  render();
})();
