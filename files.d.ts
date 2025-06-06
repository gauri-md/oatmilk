import { APIResource } from "../../../resource.js";
import * as Core from "../../../core.js";
import * as ContentAPI from "./content.js";
import { Content } from "./content.js";
import { CursorPage, type CursorPageParams } from "../../../pagination.js";
export declare class Files extends APIResource {
    content: ContentAPI.Content;
    /**
     * Create a Container File
     *
     * You can send either a multipart/form-data request with the raw file content, or
     * a JSON request with a file ID.
     */
    create(containerId: string, body: FileCreateParams, options?: Core.RequestOptions): Core.APIPromise<FileCreateResponse>;
    /**
     * Retrieve Container File
     */
    retrieve(containerId: string, fileId: string, options?: Core.RequestOptions): Core.APIPromise<FileRetrieveResponse>;
    /**
     * List Container files
     */
    list(containerId: string, query?: FileListParams, options?: Core.RequestOptions): Core.PagePromise<FileListResponsesPage, FileListResponse>;
    list(containerId: string, options?: Core.RequestOptions): Core.PagePromise<FileListResponsesPage, FileListResponse>;
    /**
     * Delete Container File
     */
    del(containerId: string, fileId: string, options?: Core.RequestOptions): Core.APIPromise<void>;
}
export declare class FileListResponsesPage extends CursorPage<FileListResponse> {
}
export interface FileCreateResponse {
    /**
     * Unique identifier for the file.
     */
    id: string;
    /**
     * Size of the file in bytes.
     */
    bytes: number;
    /**
     * The container this file belongs to.
     */
    container_id: string;
    /**
     * Unix timestamp (in seconds) when the file was created.
     */
    created_at: number;
    /**
     * The type of this object (`container.file`).
     */
    object: 'container.file';
    /**
     * Path of the file in the container.
     */
    path: string;
    /**
     * Source of the file (e.g., `user`, `assistant`).
     */
    source: string;
}
export interface FileRetrieveResponse {
    /**
     * Unique identifier for the file.
     */
    id: string;
    /**
     * Size of the file in bytes.
     */
    bytes: number;
    /**
     * The container this file belongs to.
     */
    container_id: string;
    /**
     * Unix timestamp (in seconds) when the file was created.
     */
    created_at: number;
    /**
     * The type of this object (`container.file`).
     */
    object: 'container.file';
    /**
     * Path of the file in the container.
     */
    path: string;
    /**
     * Source of the file (e.g., `user`, `assistant`).
     */
    source: string;
}
export interface FileListResponse {
    /**
     * Unique identifier for the file.
     */
    id: string;
    /**
     * Size of the file in bytes.
     */
    bytes: number;
    /**
     * The container this file belongs to.
     */
    container_id: string;
    /**
     * Unix timestamp (in seconds) when the file was created.
     */
    created_at: number;
    /**
     * The type of this object (`container.file`).
     */
    object: 'container.file';
    /**
     * Path of the file in the container.
     */
    path: string;
    /**
     * Source of the file (e.g., `user`, `assistant`).
     */
    source: string;
}
export interface FileCreateParams {
    /**
     * The File object (not file name) to be uploaded.
     */
    file?: Core.Uploadable;
    /**
     * Name of the file to create.
     */
    file_id?: string;
}
export interface FileListParams extends CursorPageParams {
    /**
     * Sort order by the `created_at` timestamp of the objects. `asc` for ascending
     * order and `desc` for descending order.
     */
    order?: 'asc' | 'desc';
}
export declare namespace Files {
    export { type FileCreateResponse as FileCreateResponse, type FileRetrieveResponse as FileRetrieveResponse, type FileListResponse as FileListResponse, FileListResponsesPage as FileListResponsesPage, type FileCreateParams as FileCreateParams, type FileListParams as FileListParams, };
    export { Content as Content };
}
//# sourceMappingURL=files.d.ts.map