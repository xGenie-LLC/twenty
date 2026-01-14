#!/bin/sh
set -e

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Run setup and migration scripts
    has_schema=$(psql -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')" ${PG_DATABASE_URL})
    if [ "$has_schema" = "f" ]; then
        echo "Database appears to be empty, running migrations."
        NODE_OPTIONS="--max-old-space-size=1500" tsx ./scripts/setup-db.ts
    fi

    echo "Running core database migrations..."
    yarn database:migrate:prod

    if [ -z "${APP_VERSION}" ]; then
        echo "APP_VERSION is not set, skipping workspace upgrade command."
    else
        current_major=$(echo "${APP_VERSION}" | cut -d. -f1)
        current_minor=$(echo "${APP_VERSION}" | cut -d. -f2)

        upgrade_versions="1.12.0 1.13.0 1.14.0 1.15.0 1.16.0"

        for upgrade_version in ${upgrade_versions}; do
            upgrade_major=$(echo "${upgrade_version}" | cut -d. -f1)
            upgrade_minor=$(echo "${upgrade_version}" | cut -d. -f2)

            if [ "${upgrade_major}" -lt "${current_major}" ] || \
              { [ "${upgrade_major}" -eq "${current_major}" ] && [ "${upgrade_minor}" -le "${current_minor}" ]; }; then
                echo "Running workspace upgrade for ${upgrade_version}..."
                APP_VERSION="${upgrade_version}" yarn command:prod upgrade
            fi
        done
    fi

    echo "Successfully migrated DB!"
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
register_background_jobs

# Continue with the original Docker command
exec "$@"
