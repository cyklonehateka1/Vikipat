import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class OperationsJobsSchema1720000002000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
