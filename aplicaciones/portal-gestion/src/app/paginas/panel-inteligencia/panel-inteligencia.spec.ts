import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PanelInteligencia } from './panel-inteligencia';
import { TemaService } from '../../core/tema.service';
import { signal } from '@angular/core';
import { AutenticacionService } from '../../core/auth/autenticacion.service';
import { Router } from '@angular/router';
import { vi } from 'vitest';

describe('PanelInteligencia', () => {
  it('exige HTTPS fuera de loopback y rechaza tokens vencidos o sin exp', () => {
    const token = signal<string | null>(null);
    const cerrarSesion = vi.fn();
    const navigate = vi.fn();
    TestBed.configureTestingModule({
      imports: [PanelInteligencia],
      providers: [
        { provide: AutenticacionService, useValue: { token, cerrarSesion } },
        { provide: Router, useValue: { navigate } },
        { provide: TemaService, useValue: { temaActual: signal('claro') } },
      ],
    });
    const componente = TestBed.createComponent(PanelInteligencia).componentInstance;
    const acceso = componente as unknown as { validarUrl(url: string): URL; obtenerTokenVigente(): string };
    expect(() => acceso.validarUrl('http://ejemplo.com/remoteEntry.js')).toThrow();
    expect(acceso.validarUrl('http://localhost:4174/remoteEntry.js').protocol).toBe('http:');
    expect(acceso.validarUrl('https://ejemplo.com').protocol).toBe('https:');
    for (const carga of [{}, { exp: 1 }]) {
      token.set(`a.${btoa(JSON.stringify(carga))}.c`);
      expect(() => acceso.obtenerTokenVigente()).toThrow();
    }
    expect(cerrarSesion).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    const vigente = `a.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 60 }))}.c`;
    token.set(vigente);
    expect(acceso.obtenerTokenVigente()).toBe(vigente);
  });
  it('muestra error y permite reintentar si falta configuración', async () => {
    const configuracion = window.adorbitPanelInteligencia;
    delete window.adorbitPanelInteligencia;
    TestBed.configureTestingModule({
      imports: [PanelInteligencia],
      providers: [provideRouter([]), { provide: TemaService, useValue: { temaActual: signal('claro') } }],
    });
    const vista = TestBed.createComponent(PanelInteligencia);
    vista.detectChanges();
    await vista.whenStable();
    vista.detectChanges();
    expect(vista.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(vista.nativeElement.querySelector('button').textContent).toContain('Reintentar');
    vista.destroy();
    window.adorbitPanelInteligencia = configuracion;
  });
});
