# Börek Time menu: Laravel API + built React app in one container (nginx + PHP-FPM).
FROM serversideup/php:8.4-fpm-nginx

USER root
RUN install-php-extensions gd intl
USER www-data

WORKDIR /var/www/html
COPY --chown=www-data:www-data backend/ /var/www/html/

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
 && php artisan storage:link

ENV PHP_UPLOAD_MAX_FILE_SIZE=24M \
    PHP_POST_MAX_SIZE=26M \
    PHP_OPCACHE_ENABLE=1
