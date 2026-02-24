(function($){

    // =========================================================
    // 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Рендеринг и форматирование)
    // =========================================================

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/[&<>"]/g, function(c){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];
        });
    }

    function formatMoney(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '0 ₽';
        return Number(amount).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
    }

    function formatDate(dateString) {
        if (!dateString) return '—';
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        return dateString;
    }

    function validateINN(inn){
        return /^\d{10}$/.test(inn) || /^\d{12}$/.test(inn);
    }

    function processLegalCases(inn, casesList) {
        if (!casesList || !Array.isArray(casesList)) return null;
        const allYears = [...new Set(casesList.map(c => c.Дата ? parseInt(c.Дата.split('-')[0]) : null))].filter(Boolean).sort((a, b) => b - a);
        const yearsToShow = allYears.slice(0, 2);

        if (yearsToShow.length === 0) return null;

        const stats = {};
        yearsToShow.forEach(y => {
            stats[y] = { plaintiff: { sum: 0, count: 0, cases: [] }, defendant: { sum: 0, count: 0, cases: [] } };
        });

        casesList.forEach(c => {
            if (!c.Дата) return;
            const year = parseInt(c.Дата.split('-')[0]);
            if (!yearsToShow.includes(year)) return;

            const amount = c.СуммИск || 0;

            let isPlaintiff = c.Ист && c.Ист.some(p => p.ИНН === inn);
            let isDefendant = c.Ответ && c.Ответ.some(d => d.ИНН === inn);

            if (isPlaintiff) {
                stats[year].plaintiff.sum += amount;
                stats[year].plaintiff.count++;
                stats[year].plaintiff.cases.push({ ...c, amount });
            } else if (isDefendant) {
                stats[year].defendant.sum += amount;
                stats[year].defendant.count++;
                stats[year].defendant.cases.push({ ...c, amount });
            }
        });

        yearsToShow.forEach(y => {
            stats[y].plaintiff.cases.sort((a, b) => b.amount - a.amount);
            stats[y].defendant.cases.sort((a, b) => b.amount - a.amount);
        });

        return stats;
    }

    // --- Рендеринг карточки ИП ---
    function renderEntrepreneurCard(data) {
        const basic = data.card?.basic || {};
        const legal = data.card?.legal || {};
        const entrepreneur = data.report?.entrepreneur?.data || {};
        const taxes = data.risks_and_taxes?.taxes_summary;
        const contracts = data.risks_and_taxes?.gov_contracts;
        const inn = data.inn;

        let html = `
            <div class="inn-result-card entrepreneur-card">
                <h2>${escapeHtml(entrepreneur.ФИО || basic.short_name)} (ИП)</h2>
                <p class="status status-${entrepreneur.Статус?.Код === '001' ? 'active' : 'inactive'}">
                    ${escapeHtml(entrepreneur.Статус?.Наим || '—')}
                </p>

                <div class="card-section">
                    <h3>Общие сведения</h3>
                    <ul>
                        <li><strong>ИНН:</strong> ${escapeHtml(inn || '—')}</li>
                        <li><strong>ОГРНИП:</strong> ${escapeHtml(entrepreneur.ОГРНИП || '—')}</li>
                        <li><strong>Дата регистрации:</strong> ${formatDate(basic.registration_date || entrepreneur.ДатаРег)}</li>
                        <li><strong>Основной ОКВЭД:</strong> ${escapeHtml(basic.okved_main?.code || entrepreneur.ОКВЭД?.Код)} ${escapeHtml(basic.okved_main?.name || entrepreneur.ОКВЭД?.Наим)}</li>
                        <li><strong>Адрес (Нас. пункт):</strong> ${escapeHtml(entrepreneur.НасПункт || basic.address || '—')}</li>
                    </ul>
                </div>

                ${taxes && taxes.total_tax_paid ? `
                <div class="card-section taxes-section">
                    <h3>Налоги и Взносы (по данным ФНС)</h3>
                    <ul>
                        <li><strong>Общая сумма налогов:</strong> ${formatMoney(taxes.total_tax_paid)}</li>
                        <li><strong>Общая сумма страх. взносов:</strong> ${formatMoney(taxes.total_insurance_paid)}</li>
                        ${taxes.debt_amount ? `<li><strong>Недоимка/Долг (на ${escapeHtml(taxes.payments_date)}):</strong> <span class="risk-highlight">${formatMoney(taxes.debt_amount)}</span></li>` : ''}
                    </ul>
                </div>` : ''}

                ${contracts && (contracts.supplier?.count > 0 || contracts.customer?.count > 0) ? `
                <div class="card-section contracts-section">
                    <h3>Госконтракты (44-ФЗ, 223-ФЗ)</h3>
                    <ul>
                        <li><strong>Поставщик:</strong> ${contracts.supplier.count} на сумму ${formatMoney(contracts.supplier.amount)}</li>
                        <li><strong>Заказчик:</strong> ${contracts.customer.count} на сумму ${formatMoney(contracts.customer.amount)}</li>
                    </ul>
                </div>` : ''}

                <div class="card-section legal-section">
                    <h3>Судебные дела и Исполнит. пр-ва</h3>
                    <ul>
                        <li><strong>Судебных дел:</strong> ${legal.legal_cases_total || 0}</li>
                        <li><strong>Сумма исков:</strong> ${formatMoney(legal.legal_cases_amount || 0)}</li>
                        <li><strong>Исполнит. производств:</strong> ${legal.enforcements_total || 0}</li>
                    </ul>
                </div>

            </div>
        `;
        return html;
    }

    // --- Рендеринг карточки Юр. Лица ---
    function renderCompanyCardContent(data) {
        try {
            const inn = data.inn;
            const report = data.report?.company?.data || {};
            const basic = data.card?.basic || {};

            // Получаем текст отчета (универсальный путь)
            const screeningData = data.card?.screening || data.financial_screening || {};
            const reportText = screeningData.reportText || screeningData.screening?.reportText || '';

            const enforcements = data.enforcements?.data || {};
            const legalDataBlock = data['legal-cases'] || data.report?.['legal-cases'] || {};
            const legalRaw = legalDataBlock.data?.Записи || [];

            // Базовая инфо
            const fullName = basic.full_name || report.НаимПолн || 'Название не указано';
            const address = basic.address?.АдресРФ || report.ЮрАдрес?.АдресРФ || 'Адрес не найден';
            const ogrn = basic.ogrn || report.ОГРН;
            const status = basic.status || report.Статус?.Наим || '—';
            const regDate = formatDate(basic.registration_date || report.ДатаРег);

            // Директор
            let director = '—';
            if (report.Руковод && report.Руковод.length > 0) {
                director = report.Руковод[0].ФИО;
            }

            // ОКВЭД и персонал
            const mainOkved = basic.okved_main ? `${basic.okved_main.code} ${basic.okved_main.name}` : (report.ОКВЭД ? `${report.ОКВЭД.Код} ${report.ОКВЭД.Наим}` : '—');
            const staffCount = report.СЧР || '—';

            // Риски
            const taxDebts = report.Налоги?.СумНедоим || 0;
            const isMassAddress = report.ЮрАдрес?.МассАдрес && report.ЮрАдрес.МассАдрес.length > 0;
            const enforceTotal = enforcements.ОбщСум || 0;

            // Обработка судов
            const legalStats = processLegalCases(inn, legalRaw);

            // --- HTML Сборка ---
            let html = `<div class="inn-card">`;

            // 1. Шапка
            html += `
                <div class="inn-header">
                    <h2>${escapeHtml(fullName)}</h2>
                    <div class="address">📍 ${escapeHtml(address)}</div>
            </div>`;

            // 2. Грид основных данных
            html += `<div class="inn-grid">`;

            // Блок 1: Реквизиты
            html += `
                <div class="inn-block">
                    <h4>📋 Реквизиты</h4>
                    <div class="data-row"><span class="label">ИНН:</span> <span class="value">${escapeHtml(inn)}</span></div>
                    <div class="data-row"><span class="label">ОГРН:</span> <span class="value">${escapeHtml(ogrn)}</span></div>
                    <div class="data-row"><span class="label">Дата рег.:</span> <span class="value">${regDate}</span></div>
                    <div class="data-row"><span class="label">Статус:</span> <span class="value">${escapeHtml(status)}</span></div>
                </div>
            `;

            // Блок 2: Управление и Деятельность
            html += `
                <div class="inn-block">
                    <h4>👔 Управление и Штат</h4>
                    <div class="data-row"><span class="label">Директор:</span> <span class="value">${escapeHtml(director)}</span></div>
                    <div class="data-row"><span class="label">Персонал:</span> <span class="value">${staffCount} чел.</span></div>
                    <div style="margin-top:8px; font-size:12px; color:#555;">
                        <strong>ОКВЭД:</strong><br>${escapeHtml(mainOkved)}
                    </div>
                </div>
            `;
            html += `</div>`; // конец grid

            // 3. Индикаторы риска
            html += `<div class="inn-section"><h3>⚠️ Индикаторы риска</h3><div class="risk-container">`;

            if (isMassAddress) html += `<span class="risk-tag warning">Массовый адрес</span>`;
            if (taxDebts > 0) html += `<span class="risk-tag danger">Налоговые долги: ${formatMoney(taxDebts)}</span>`;
            else html += `<span class="risk-tag success">Налоговых долгов нет</span>`;

            if (enforceTotal > 0) html += `<span class="risk-tag danger">Исп. производства: ${formatMoney(enforceTotal)}</span>`;

            // Проверка на массового директора (из report)
            if (report.Руковод && report.Руковод[0]?.МассРуковод) html += `<span class="risk-tag warning">Массовый руководитель</span>`;

            html += `</div></div>`;

            // 4. Финансовый анализ (как у Евы)
            if (reportText) {
                html += `
                    <div class="inn-section">
                        <h3>📈 Финансовый AI анализ</h3>
                        <div class="finance-text">${escapeHtml(reportText).replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }

            // 5. Судебная активность
            if (legalStats) {
                let legalContent = '';
                const years = Object.keys(legalStats).sort().reverse();

                years.forEach(year => {
                    const yData = legalStats[year];
                    if (yData.plaintiff.count === 0 && yData.defendant.count === 0) return;

                    let yearHtml = `<div class="legal-year-block">
                        <div class="legal-year-title">Суды ${year} года</div>
                        <div class="data-row"><span class="label">Истец:</span> <span class="value sum-positive">${formatMoney(yData.plaintiff.sum)} (${yData.plaintiff.count} дел)</span></div>
                        <div class="data-row"><span class="label">Ответчик:</span> <span class="value sum-negative">${formatMoney(yData.defendant.sum)} (${yData.defendant.count} дел)</span></div>
                    `;

                    if (yData.defendant.cases.length > 0) {
                        yearHtml += `<div style="margin-top:8px; font-weight:600; font-size:12px;">Топ-3 как ответчик:</div>`;
                        yData.defendant.cases.slice(0, 3).forEach((c, idx) => {
                            const link = c.СтрКАД ? c.СтрКАД : '#';
                            yearHtml += `<div class="legal-case-item">${idx+1}. <a href="${link}" target="_blank">${c.Номер}</a> от ${formatDate(c.Дата)} — <span class="sum-negative">${formatMoney(c.amount)}</span></div>`;
                        });
                    }
                    yearHtml += `</div>`;
                    legalContent += yearHtml;
                });

                if (legalContent) {
                    html += `<div class="inn-section"><h3>⚖️ Судебная активность</h3>`;
                    html += legalContent;
                    html += `</div>`;
                }
            }

            html += `</div>`; // конец inn-card
            return html;

        } catch (err) {
            console.error('Ошибка рендеринга:', err);
            return `<div class="inn-error">
                        <h3>КРИТИЧЕСКАЯ ОШИБКА РЕНДЕРИНГА</h3>
                        <p><strong>Причина:</strong> ${escapeHtml(err.message)}</p>
                        <p>Проверьте вкладку Console (Консоль) для деталей.</p>
                    </div>`;
        }
    }

    function renderEntityCard(data) {
        if (data.main_type === 'entrepreneur') {
            return renderEntrepreneurCard(data);
        } else if (data.main_type === 'company' || !data.main_type) {
            return renderCompanyCardContent(data);
        } else {
            return '<div style="color:red; text-align:center; padding:20px;">Ошибка: Неизвестный тип сущности.</div>';
        }
    }

    // =========================================================================
    // 2. ГЛАВНЫЙ БЛОК: УПРАВЛЕНИЕ ТОКЕНОМ И API (ИСПРАВЛЕННАЯ ЛОГИКА)
    // =========================================================================

    // Переменная для хранения JWT (достаем из сессии при старте)
    let authToken = sessionStorage.getItem('eva_jwt');

    // Функция запроса токена у iframe (чата)
    function requestTokenFromChat() {
        // Ищем iframe по части src или по другим признакам.
        // Адаптируйте селектор, если структура DOM изменится.
        const chatFrame = document.querySelector('iframe[src*="app.eva-dragon.ru"]') ||
                          document.querySelector('iframe.eva-modal-iframe');
        
        if (chatFrame && chatFrame.contentWindow) {
            console.log("[Checko] Requesting token from Chat iframe...");
            chatFrame.contentWindow.postMessage({ type: 'REQUEST_TOKEN' }, '*');
        } else {
            console.warn("[Checko] Iframe чата не найден. Токен запросить невозможно.");
        }
    }

    // 1. Слушаем сообщения от iframe (Чата), чтобы получить токен
    window.addEventListener('message', function(event) {
        // Проверяем, что сообщение пришло от нашего чата (по типу данных)
        if (event.data && event.data.type === 'EVA_TOKEN_BROADCAST') {
            console.log("[Checko] Token received from Chat!");
            authToken = event.data.token;
            // Сохраняем, чтобы не терять при перезагрузке
            sessionStorage.setItem('eva_jwt', authToken);
            
            // Если была ошибка авторизации в модальном окне, скрываем её
            if ($('#innModal').is(':visible')) {
                $('#innError').hide();
            }
        }
    });

    // 2. При загрузке страницы пробуем запросить токен с небольшой задержкой
    // Это нужно, чтобы Iframe успел прогрузиться
    $(document).ready(function() {
        setTimeout(requestTokenFromChat, 2000);
    });

    // ==== Обработчики событий (JQuery) ====

    // Открытие модального окна
    /* <-- ДОБАВИТЬ КОММЕНТАРИЙ НАЧАЛО
    document.addEventListener('DOMContentLoaded', () => {
    
        const openButtons = document.querySelectorAll('.js-open-inn-modal');
        const modals = document.querySelectorAll('.inn-modal');
    
        function closeAllModals() {
            modals.forEach(modal => {
                modal.style.display = 'none';
                modal.classList.remove('is-active');
            });
            document.body.classList.remove('modal-open');
        }
    
        function openModal(selector) {
            const modal = document.querySelector(selector);
            if (!modal) return;
    
            closeAllModals();
    
            modal.style.display = 'flex';
            modal.classList.add('is-active');
            document.body.classList.add('modal-open');
        }
    
        // Открытие по карточке
        openButtons.forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();
                const target = button.dataset.modalTarget;
                if (target) {
                    openModal(target);
                }
            });
        });
        
    
        // Закрытие по overlay и кнопке закрытия
        document.addEventListener('click', e => {
            if (
                e.target.classList.contains('inn-modal__overlay') ||
                e.target.closest('.inn-modal__close')
            ) {
                closeAllModals();
            }
        });
    
        // ESC
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    
    });
    КОНЕЦ КОММЕНТАРИЯ --> */

    // Закрытие модального окна

    $(document).on('click', '#innCancel, .inn-modal__close, .inn-modal__overlay', function(e){
        e.preventDefault();
        $('#innModal').fadeOut(160);
        // ВАЖНО: Возвращаем скролл сайту
        $('body').removeClass('overflow-hidden modal-open');
    });

    // 🔥 3. ОБНОВЛЕННЫЙ ОБРАБОТЧИК ОТПРАВКИ ФОРМЫ (С ожиданием)
    $(document).on('click', '#innSubmit', async function(e){
        e.preventDefault();

        const $submitBtn = $('#innSubmit');
        // Сразу блокируем кнопку, чтобы не нажимали много раз
        $submitBtn.prop('disabled', true);
        
        var inn = $('#innInput').val().trim();

        if (!validateINN(inn)) {
            $('#innError').show().text('ИНН должен содержать 10 или 12 цифр.');
            $submitBtn.prop('disabled', false);
            return;
        }

        // --- ЛОГИКА ОЖИДАНИЯ ТОКЕНА (FIX RACE CONDITION) ---
        if (!authToken) {
            console.log("[Checko] Токена нет, пытаюсь запросить перед отправкой...");
            // Запрашиваем токен
            requestTokenFromChat();
            
            // Визуально показываем пользователю, что идет процесс
            const originalBtnText = $submitBtn.html();
            $submitBtn.text('Авторизация...');
            
            // Ждем 2.5 секунды
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // Возвращаем текст кнопки
            $submitBtn.html(originalBtnText);

            // Если токен так и не пришел
            if (!authToken) {
                $('#innError').show().html('Ошибка авторизации: Чат не ответил.<br>Пожалуйста, убедитесь, что вы вошли в Чат-виджет (справа внизу) и обновите страницу.');
                $submitBtn.prop('disabled', false);
                return;
            }
        }
        // ---------------------------------------------------

        $('#innError').hide();
        $('#innResult').html('<div style="text-align:center; padding:20px; color:#666;">Загрузка данных нейросети...<br><small>Анализируем базы ФНС, Судов и Росстата</small></div>');

        try {
            // 🔥 Отправляем запрос с заголовком Authorization
            const resp = await fetch(`/checko/check-in?inn=${inn}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'Content-Type': 'application/json'
                }
            });

            // Обработка ошибок авторизации (401/403)
            if (resp.status === 401 || resp.status === 403) {
                 // Если сервер ответил отказом, возможно токен протух
                 sessionStorage.removeItem('eva_jwt');
                 authToken = null;
                 throw new Error("Доступ запрещен или токен истек. Пожалуйста, перезайдите в чат.");
            }
            if (!resp.ok) {
                 // Пытаемся получить детали ошибки из JSON
                 const errorData = await resp.json();
                 throw new Error(errorData.error || `Ошибка сервера: ${resp.status}`);
            }

            const data = await resp.json();

            if (data.error) throw new Error(data.error);

            // ВЫЗЫВАЕМ ДИСПЕТЧЕР ОТРИСОВКИ
            $('#innResult').html(renderEntityCard(data));

        } catch (err) {
            $('#innResult').html(`<div class="inn-error">Не удалось получить данные. <br>Детали: ${escapeHtml(err.message)}</div>`);
        } finally {
            $submitBtn.prop('disabled', false);
        }
    });

    // Закрытие по ESC
    $(document).on('keydown', e => {
        if (e.key === 'Escape') $('#innModal').fadeOut(160);
    });

})(jQuery);