/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Vente } from '../models/Vente';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VenteControllerService {
    /**
     * @param requestBody
     * @returns Vente OK
     * @throws ApiError
     */
    public static creerVenteInitiale(
        requestBody: Vente,
    ): CancelablePromise<Vente> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/ventes/initiale',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}

///home/guillaume/NetBeansJDKss/dev2/material-ui-vite/src/api/services/VenteControllerService.ts
