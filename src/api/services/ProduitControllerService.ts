/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProduitCreateRequest } from '../models/ProduitCreateRequest';
import type { ProduitDTO } from '../models/ProduitDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProduitControllerService {
    /**
     * @returns ProduitDTO OK
     * @throws ApiError
     */
    public static listProduits(): CancelablePromise<Array<ProduitDTO>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/produits',
        });
    }
    /**
     * @param requestBody
     * @returns ProduitDTO OK
     * @throws ApiError
     */
    public static createProduit(
        requestBody: ProduitCreateRequest,
    ): CancelablePromise<ProduitDTO> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/produits',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}

///home/guillaume/NetBeansJDKss/dev2/material-ui-vite/src/api/services/ProduitControllerService.ts