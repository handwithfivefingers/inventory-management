#!/bin/bash

# Configuration
CONTAINER_NAME="gamein-wiki-database-1"
DB_USER="root"
DB_PASS="mysql"
BACKUP_DIR="./dump"
DATE=$(date +"%Y%m%d%H%M%S")

# Function to display usage
usage() {
    echo "Usage: $0 {backup|restore} database_name [backup_file]"
    echo "backup: Perform a backup of the specified MySQL database"
    echo "restore: Restore the specified MySQL database from a backup file"
    echo "database_name: The name of the database to backup or restore"
    echo "backup_file: Required for restore operation. Path to the backup file."
    exit 1
}

# Function to perform backup
backup() {
    DB_NAME=$1
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$DATE.sql"
    docker exec $CONTAINER_NAME mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE
    if [ $? -eq 0 ]; then
        echo "Backup successful: $BACKUP_FILE"
    else
        echo "Backup failed"
        exit 1
    fi
}

# Function to perform restore
restore() {
    DB_NAME=$1
    BACKUP_FILE=$2
    if [ ! -f $BACKUP_FILE ]; then
        echo "Error: Backup file does not exist"
        exit 1
    fi
    docker exec -i $CONTAINER_NAME mysql -u $DB_USER -p$DB_PASS $DB_NAME < $BACKUP_FILE
    if [ $? -eq 0 ]; then
        echo "Restore successful from: $BACKUP_FILE"
    else
        echo "Restore failed"
        exit 1
    fi
}

# Main script logic
if [ $# -lt 2 ]; then
    usage
fi

case "$1" in
    backup)
        if [ $# -ne 2 ]; then
            usage
        fi
        backup $2
        ;;
    restore)
        if [ $# -ne 3 ]; then
            usage
        fi
        restore $2 $3
        ;;
    *)
        usage
        ;;
esac
