/* HTTPS room connection. Matches the original game's event
   interface while the hosted Worker persists rooms in D1 across devices. */
(function () {
    // The static Pages export sets this public URL; hosted previews stay same-origin.
    const apiRoot = '/api/battleship';
    const key = 'battleship_room_connection';
    window.createRoomConnection = function () {
        const listeners = new Map();
        const lobby = /\/online(?:\.html)?\/?$/.test(location.pathname);
        let connection = null;
        try { connection = lobby ? null : JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) {}
        if (lobby) { sessionStorage.removeItem(key); sessionStorage.removeItem('online_session'); }
        const clientId = crypto.randomUUID();
        let cursor = connection?.cursor || 0, stopped = document.hidden, explicitlyClosed = false, timer,
            generation = 0, pollInFlight = false, pollRequested = false,
            queue = Promise.resolve(), delivery = Promise.resolve(), connected = false, didConnect = false;
        const activeRequests = new Set(), presentationWaiters = new Set();
        const listenerWaiters = new Map();
        const active = epoch => !stopped && !explicitlyClosed && epoch === generation;
        const interrupted = () => Object.assign(new Error('Connection paused. Please try again.'), {interrupted:true});
        const dispatch = (name, data) => { for (const fn of listeners.get(name) || []) fn(data); };
        const announce = () => { connected = true; dispatch(didConnect ? 'connection_restored' : 'connect'); didConnect = true; };
        const persist = () => { if (connection) sessionStorage.setItem(key, JSON.stringify({...connection, cursor})); };
        const request = async (path, options = {}, epoch = generation) => {
            if (!options.keepalive && !active(epoch)) throw interrupted();
            const controller = new AbortController(), deadline = setTimeout(() => controller.abort(), 10000);
            if (!options.keepalive) activeRequests.add(controller);
            try {
                const response = await fetch(apiRoot + path, {
                    ...options, cache:'no-store', headers:{'Content-Type':'application/json',
                        ...(connection ? {'Authorization':'Bearer ' + connection.token} : {}), ...options.headers}, signal:controller.signal
                });
                if (!options.keepalive && !active(epoch)) throw interrupted();
                const value = await response.json();
                if (!options.keepalive && !active(epoch)) throw interrupted();
                if (!response.ok) { const error = new Error(value.error || 'The connection could not be completed.'); error.status = response.status; throw error; }
                return value;
            } catch (error) {
                if (!options.keepalive && !active(epoch)) throw interrupted();
                throw error;
            } finally { clearTimeout(deadline); activeRequests.delete(controller); }
        };
        const presentationWait = (epoch, setup) => new Promise(resolve => {
            let cleanup = () => {};
            const finish = value => { presentationWaiters.delete(finish); cleanup(); resolve(value); };
            presentationWaiters.add(finish);
            cleanup = setup(finish);
            if (!active(epoch)) finish(false);
        });
        const waitForPresentation = async (type, epoch) => {
            if (!active(epoch)) return false;
            if (!/_result$/.test(type)) return true;
            // The original cinematic installs combat listeners after its intro.
            // Keep early/fast opponent actions until those listeners are ready.
            if (!(listeners.get(type) || []).length) await presentationWait(epoch, finish => {
                if (!listenerWaiters.has(type)) listenerWaiters.set(type, new Set());
                const waiting = listenerWaiters.get(type);
                waiting.add(finish);
                return () => { waiting.delete(finish); if (!waiting.size) listenerWaiters.delete(type); };
            });
            if (!active(epoch)) return false;
            if (document.body.classList.contains('board-locked')) await presentationWait(epoch, finish => {
                const observer = new MutationObserver(() => {
                    if (!document.body.classList.contains('board-locked')) finish(true);
                });
                observer.observe(document.body, {attributes:true, attributeFilter:['class']});
                return () => observer.disconnect();
            });
            return active(epoch);
        };
        const accept = (value, epoch) => {
            delivery = delivery.catch(() => {}).then(async () => {
                for (const event of value.events || []) {
                    if (!active(epoch)) return;
                    if (event.id <= cursor) continue;
                    if (!await waitForPresentation(event.type, epoch)) return;
                    if (!active(epoch)) return;
                    cursor = event.id; persist(); dispatch(event.type, event.data);
                }
                if (!active(epoch)) return;
                cursor = Math.max(cursor, value.cursor || 0); persist();
            });
            return delivery;
        };
        const notice = (error, event) => {
            if (event === 'join_room') dispatch('join_error', {reason:error.message});
            dispatch('command_error', {reason:error.message, event});
            let banner = document.getElementById('online-notice');
            if (!banner) { banner = document.createElement('p'); banner.id='online-notice'; banner.setAttribute('role','status'); document.body.append(banner); }
            banner.textContent = error.message; banner.hidden = false;
            clearTimeout(banner.hideTimer); banner.hideTimer = setTimeout(() => { banner.hidden = true; }, 6000);
        };
        const schedulePoll = delay => {
            clearTimeout(timer);
            if (stopped || explicitlyClosed) return;
            timer = setTimeout(() => { timer = undefined; poll(); }, delay);
        };
        const poll = async () => {
            if (stopped || explicitlyClosed) return;
            if (pollInFlight) { pollRequested = true; return; }
            pollInFlight = true;
            pollRequested = false;
            const epoch = generation;
            try {
                if (!didConnect) {
                    await request('/health', {}, epoch);
                    if (!active(epoch)) return;
                    announce();
                    await queue;
                    if (!active(epoch)) return;
                }
                if (connection) await accept(await request('/rooms/' + connection.code + '?after=' + cursor, {}, epoch), epoch);
                else if (!connected) await request('/health', {}, epoch);
                if (!active(epoch)) return;
                if (!connected) announce();
            } catch (error) {
                if (!active(epoch) || error.interrupted) return;
                if (connected) { connected = false; dispatch('disconnect'); }
                if (error.status === 404 || error.status === 401) { notice(error); dispatch('rejoin_failed', {reason:error.message}); pause(); return; }
            } finally {
                pollInFlight = false;
                // Only this owner schedules the next poll. A restored page waits
                // for the old fetch/delivery to settle, then starts a new epoch.
                if (!stopped && !explicitlyClosed) schedulePoll(pollRequested || epoch !== generation ? 0 : 450);
            }
        };
        const pause = () => {
            if (explicitlyClosed) return;
            if (!stopped) { stopped = true; generation++; }
            clearTimeout(timer); timer = undefined;
            for (const controller of activeRequests) controller.abort();
            for (const finish of [...presentationWaiters]) finish(false);
        };
        const resume = () => {
            if (explicitlyClosed || document.hidden || !stopped) return;
            stopped = false;
            if (pollInFlight) pollRequested = true;
            else schedulePoll(0);
        };
        const onPageHide = () => pause();
        const onPageShow = () => resume();
        const onVisibility = () => { if (document.hidden) pause(); else resume(); };
        const socket = {
            on(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); for (const finish of [...(listenerWaiters.get(name) || [])]) finish(true); return socket; },
            emit(event, data) {
                const id = crypto.randomUUID(), epoch = generation;
                queue = queue.then(async () => {
                    if (!active(epoch)) throw interrupted();
                    let result;
                    if (event === 'create_room' || event === 'join_room') {
                        result = await request(event === 'create_room' ? '/rooms' : '/rooms/' + encodeURIComponent(String(data).trim().toUpperCase()) + '/join',
                            {method:'POST', body:JSON.stringify({clientId})}, epoch);
                        if (!active(epoch)) return;
                        connection = {code:result.code, token:result.token, seat:result.seat}; cursor = 0; persist();
                        dispatch(event === 'create_room' ? 'room_created' : 'room_joined', {code:result.code, seat:result.seat});
                    } else {
                        if (!connection) throw new Error('Please create or join a room first.');
                        // Serialize placement and confirmation, and retry the same action ID
                        // after a transient failure so a lost response cannot fire twice.
                        for (let retry = 0; retry < 3; retry++) {
                            try { result = await request('/rooms/' + connection.code + '/commands?after=' + cursor,
                                {method:'POST', body:JSON.stringify({id,event,data})}, epoch); break; }
                            catch (error) { if (error.interrupted || !active(epoch) || (error.status && error.status !== 503) || retry === 2) throw error; await new Promise(resolve => setTimeout(resolve, 350 * (retry + 1))); }
                        }
                    }
                    await accept(result, epoch);
                }).catch(error => {
                    if (explicitlyClosed) return;
                    if (error.interrupted) dispatch('command_error', {reason:error.message, event, interrupted:true});
                    else if (!stopped) notice(error, event);
                });
                return socket;
            },
            disconnect() {
                if (explicitlyClosed) return;
                pause(); explicitlyClosed = true;
                removeEventListener('pagehide', onPageHide);
                removeEventListener('pageshow', onPageShow);
                document.removeEventListener('visibilitychange', onVisibility);
                if (connection) request('/rooms/' + connection.code + '/commands', {method:'POST',keepalive:true,
                    body:JSON.stringify({id:crypto.randomUUID(),event:'leave_room'})}).catch(() => {});
                sessionStorage.removeItem(key); sessionStorage.removeItem('online_session'); dispatch('disconnect');
            }
        };
        // Browsing from the lobby into deployment keeps the authenticated seat.
        // Closing a mobile tab does not destroy the opponent's room immediately.
        addEventListener('pagehide', onPageHide);
        addEventListener('pageshow', onPageShow);
        document.addEventListener('visibilitychange', onVisibility);
        window.leaveBattleship = () => socket.disconnect();
        document.querySelector('.nav-home-btn')?.addEventListener('click', () => socket.disconnect());
        schedulePoll(0);
        return socket;
    };
}());
