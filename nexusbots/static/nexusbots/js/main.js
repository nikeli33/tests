$(document).ready(function () {

    /* ==============================================
       0. ФИКС НАЧАЛЬНОЙ ВИДИМОСТИ ШАПКИ
       (Удаляет классы WOW, чтобы шапка была видна сразу, как раньше)
       ============================================== */
    const headerElement = $('.header');
    
    // 1. Удаляем класс WOW, чтобы не было задержки в 1 секунду
    headerElement.removeClass('wow'); 
    
    // 2. Удаляем атрибут задержки
    headerElement.removeAttr('data-wow-delay'); 
    
    // 3. Добавляем класс, который, вероятно, делал ее видимой сразу в старых стилях
    headerElement.addClass('animated'); 
    

    /* ==============================================
       1. ПРЕЛОАДЕР
       ============================================== */
    $(window).on('load', function () {
        const preloader = $('.preloader');
        preloader.addClass('is_hide');
        setTimeout(function () {
            preloader.remove();
            // Инициализация анимаций при скролле после загрузки
            if (typeof WOW !== 'undefined') {
                new WOW().init();
            }
        }, 300);
    });
    
    /* ==============================================
       2. ШАПКА (HEADER) И СКРОЛЛ
       ============================================== */
    let lastScrollTop = 0;
    const header = $('.header');
    const body = $('body');

    $(window).on('scroll', function () {
        const scrollTop = $(this).scrollTop();
        const headerHeight = header.outerHeight();

        // Фиксация шапки
        if (scrollTop > headerHeight) {
            body.addClass('header-fixed');
        } else {
            body.removeClass('header-fixed');
        }

        // Скрытие/показ шапки при скролле
        if (scrollTop > headerHeight + 100) {
            header.addClass('is-shown');
            if (scrollTop > lastScrollTop) {
                header.addClass('hide-nav'); // Скролл вниз
            } else {
                header.removeClass('hide-nav'); // Скролл вверх
            }
        } else {
            header.removeClass('is-shown hide-nav');
        }
        lastScrollTop = scrollTop;
    });

    /* ==============================================
       3. МОБИЛЬНОЕ МЕНЮ (БУРГЕР)
       ============================================== */
    $('.js-menu').on('click', function () {
        body.toggleClass('menu-on');
        
        if (body.hasClass('menu-on')) {
            body.addClass('overflow-hidden');
        } else {
            body.removeClass('overflow-hidden');
        }
    });

    // Закрытие меню при клике на ссылку
    $('.mobile-nav__menu a').on('click', function () {
        body.removeClass('menu-on overflow-hidden');
    });

    /* ==============================================
       4. ПЛАВНЫЙ СКРОЛЛ К ЯКОРЯМ
       ============================================== */
    $('a[href^="#"]').on('click', function (e) {
        const href = $(this).attr('href');
        if (href.length > 1 && $(href).length) {
            e.preventDefault();
            const offset = 80; // Отступ для шапки
            $('html, body').animate({
                scrollTop: $(href).offset().top - offset
            }, 800);
        }
    });

    /* ==============================================
       5. ПРОМО БЛОК (ТАБЫ + АНИМАЦИЯ КАРТИНОК)
       ============================================== */
    
    // 5.1. Логика переключения табов при наведении
    $('.js-promoAnimationLink').on('mouseenter', function () {
        const _this = $(this);
        const currentTabId = _this.data('tab'); // Например: 'tab0', 'tab1'

        // Управление классами ссылок
        $('.js-promoAnimationLink').removeClass('is_active');
        _this.addClass('is_active');

        // Показываем родительский контейнер (если нужно для стилей)
        _this.closest('.js-promoAnimation').addClass('items_show');

        // Переключаем табы
        $('.tab-block').removeClass('is-active');
        $('#' + currentTabId).addClass('is-active');
    });

    // Скрытие/сброс при уходе мыши с блока
    $('.js-promoAnimation').on('mouseleave', function () {
        $('.js-promoAnimationLink').removeClass('is_active');
        $(this).removeClass('items_show');
        $('.tab-block').removeClass('is-active');
    });

    // 5.2. Логика анимации (бесконечный сдвиг картинок)
    const slidesWrappers = document.querySelectorAll('.js-slides');

    if (slidesWrappers.length > 0) {
        slidesWrappers.forEach(function (wrapper) {
            
            // Функция шага анимации
            function stepAnimation() {
                // 1. Добавляем класс трансформации контейнеру (сдвиг)
                wrapper.classList.add('is-transform');

                // 2. Берем первый элемент
                const firstItem = wrapper.querySelector('.slides-item');
                if (!firstItem) return;

                // 3. Клонируем его и вставляем в конец списка
                const clone = firstItem.cloneNode(true);
                // Убедимся, что у клона нет класса анимации
                clone.classList.remove('is-animate');
                wrapper.appendChild(clone);

                // 4. Добавляем класс анимации первому элементу (он уезжает/исчезает)
                firstItem.classList.add('is-animate');

                // 5. Ждем завершения CSS перехода (1000мс)
                setTimeout(function () {
                    // Убираем класс сдвига с контейнера (возвращаем координаты)
                    wrapper.classList.remove('is-transform');
                    
                    // Удаляем старый первый элемент из DOM
                    firstItem.remove();

                    // Планируем следующий шаг
                    requestAnimationFrame(function () {
                        // Задержка между анимациями (1000мс = 1с)
                        setTimeout(stepAnimation, 1000);
                    });
                }, 1000);
            }

            // Запускаем цикл анимации
            requestAnimationFrame(function () {
                setTimeout(stepAnimation, 1000);
            });
        });
    }

    /* ==============================================
       6. ВИДЕО (SHOWREEL)
       ============================================== */
    const showreelModal = $('#showreelModal');
    const videoFrame = showreelModal.find('.js-fullShowreelVideo');
    const videoSrc = videoFrame.data('src'); // Ссылка из data-атрибута

    // Открытие
    $('.js-showreelVideo').on('click', function () {
        showreelModal.addClass('active').fadeIn(300);
        body.addClass('overflow-hidden');
        // Добавляем автоплей в SRC при открытии
        if(videoSrc) {
            let autoplaySrc = videoSrc;
            if (videoSrc.indexOf('?') > -1) {
                autoplaySrc += '&autoplay=1';
            } else {
                autoplaySrc += '?autoplay=1';
            }
            videoFrame.attr('src', autoplaySrc);
        }
    });

    // Закрытие
    $('.js-closeModal, .showreel-modal__overlay').on('click', function (e) {
        e.preventDefault();
        showreelModal.removeClass('active').fadeOut(300);
        body.removeClass('overflow-hidden');
        // Очищаем SRC чтобы остановить видео
        videoFrame.attr('src', '');
    });
    
    
    // 6.1. БЛОКИРОВКА ПЕРЕХОДА ДЛЯ МОДАЛОК
    // Чтобы при нажатии на карточки с href="#" страница не летела вверх
    $('.js-open-inn-modal').on('click', function(e) {
        e.preventDefault(); 
    });
    // =======================
    
    

    /* ==============================================
       7. ЧАТ И ВИДЖЕТЫ (EVA)
       ============================================== */
    const $chatButtonWrapper = $('.js-chat-button-wrapper');
    const $chatPopupWindow = $('.js-chat-popup-window');
    const $openButton = $('.js-open-chat-button');
    const $closeTempButton = $('.js-close-chat-temp');
    const $closeCookieButton = $('.js-closeCookie');

    // По умолчанию
    $chatButtonWrapper.show();
    $chatPopupWindow.hide();

    // Открыть чат
    $openButton.on('click', function() {
        $chatButtonWrapper.fadeOut(200);
        $chatPopupWindow.fadeIn(300);
    });

    // Закрыть чат
    function handleCloseChat() {
        $chatPopupWindow.fadeOut(200, function() {
            $chatButtonWrapper.fadeIn(300);
        });
    }

    $closeTempButton.on('click', handleCloseChat);
    $closeCookieButton.on('click', handleCloseChat);

    // Виджет скачивания презентации (в футере)
    $('.js-downloadPresentation').on('click', function (e) {
        e.preventDefault();
        $(this).siblings('.footer-presentation-widget').slideToggle(100);
        $('.footer-presentation__back').fadeToggle();
    });
    
    // Закрытие виджета презентации при клике вне
    $('.footer-presentation__back').on('click', function() {
        $('.footer-presentation-widget').slideUp(100);
        $(this).fadeOut();
    });

    /* Логика открытия полного чата (Pop-up) */
    
    // Клик по фейковому инпуту в маленьком виджете
    $('.js-open-full-chat').on('click', function() {
        // Опционально: скрыть маленький виджет перед открытием большого
        // handleCloseChat(); 
        
        // Открываем большую модалку
        $('.js-eva-modal').fadeIn(300);
        $('body').addClass('overflow-hidden'); // Блокируем скролл страницы
    });

    // Клик по крестику или по фону (оверлею) для закрытия
    $('.js-close-eva-modal').on('click', function() {
        $('.js-eva-modal').fadeOut(300);
        $('body').removeClass('overflow-hidden'); // Возвращаем скролл
    });
    
    
    /* ==============================================
       8. ОТКРЫТИЕ И ЗАКРЫТИЕ ИНСТРУМЕНТОВ
       ============================================== */
    
    // Универсальное открытие модалок по data-modal-target
    $('.js-open-inn-modal').on('click', function(e) {
        e.preventDefault();
        const targetId = $(this).data('modal-target');
        const $targetModal = $(targetId);

        if ($targetModal.length) {
            $targetModal.fadeIn(300).css('display', 'flex'); // display: flex нужен для центрирования css inn-modal
            $('body').addClass('overflow-hidden');
        }
    });

    // Закрытие модалки Редактора (по крестику и фону)
    $('.js-close-redactor').on('click', function() {
        $('#redactorModal').fadeOut(300);
        $('body').removeClass('overflow-hidden');
    });

    // Закрытие модалки Калькулятора (если вдруг его не было в коде)
    $('.js-close-calc').on('click', function() {
        $(this).closest('.inn-modal').fadeOut(300);
        $('body').removeClass('overflow-hidden');
    });

    // Закрытие модалки Сбора Данных
    $('.js-close-dataCollection').on('click', function() {
        $('#dataCollectionModal').fadeOut(300);
        $('body').removeClass('overflow-hidden');

        // Отправляем сообщение для остановки видео в iframe
        const videoIframe = document.getElementById('videoPlayerIframe');
        if (videoIframe && videoIframe.contentWindow) {
            videoIframe.contentWindow.postMessage({ type: 'STOP_VIDEO_PLAYBACK' }, 'https://nexus-video-player.vercel.app'); // Указываем конкретный origin
        }
    });

});

        $(document).ready(function() {
            const $chatButtonWrapper = $('.js-chat-button-wrapper');
            const $chatPopupWindow = $('.js-chat-popup-window');
            const $openButton = $('.js-open-chat-button');
            const $closeTempButton = $('.js-close-chat-temp'); // Кнопка "×"
            const $closeCookieButton = $('.js-closeCookie'); // Кнопка "Закрыть чат" (теперь выполняет временное закрытие)

            // Инициализация: Окно чата всегда скрыто по умолчанию, значок чата всегда показан.
            // (Логика куки удалена)
            $chatButtonWrapper.show();
            $chatPopupWindow.hide();

            // 1. Обработчик ОТКРЫТИЯ окна (нажатие на значок)
            $openButton.on('click', function() {
                $chatButtonWrapper.fadeOut(200); // Скрываем значок
                $chatPopupWindow.fadeIn(300); // Показываем окно
            });

            // 2. Обработчик ВРЕМЕННОГО ЗАКРЫТИЯ (для кнопок "Закрыть чат" И "×")
            // Это функция обеспечивает временное скрытие окна и показ значка обратно.
            function handleTemporaryClose() {
                $chatPopupWindow.fadeOut(200, function() {
                    $chatButtonWrapper.fadeIn(300); // Показываем значок обратно
                });
            }

            // Применяем функцию к обеим кнопкам закрытия
            $closeTempButton.on('click', handleTemporaryClose);
            $closeCookieButton.on('click', handleTemporaryClose);
        });

document.addEventListener('DOMContentLoaded', function() {
    const sendBtn = document.getElementById('send-button');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
});

