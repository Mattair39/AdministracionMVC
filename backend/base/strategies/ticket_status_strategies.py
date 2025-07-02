"""
Sistema de estrategias para el manejo de estados de tickets.
Implementa el principio Abierto/Cerrado (OCP) permitiendo la extensión
de nuevos estados sin modificar el código existente.
"""

from abc import ABC, abstractmethod


class TicketStatusStrategy(ABC):
    @abstractmethod
    def get_next_valid_statuses(self):
        pass
    
    @abstractmethod
    def can_log_hours(self):
        pass
    
    @abstractmethod
    def get_status_color(self):
        pass
    
    @abstractmethod
    def get_status_icon(self):
        pass
    
    @abstractmethod
    def can_edit_ticket(self):
        pass
    
    @abstractmethod
    def requires_user_assignment(self):
        pass


class RecibidoStatusStrategy(TicketStatusStrategy):
 
    def get_next_valid_statuses(self):
        return ['En Proceso']
    
    def can_log_hours(self):
        return False
    
    def get_status_color(self):
        return 'orange'
    
    def get_status_icon(self):
        return 'inbox'
    
    def can_edit_ticket(self):
        return True
    
    def requires_user_assignment(self):
        return False


class EnProcesoStatusStrategy(TicketStatusStrategy):
    
    def get_next_valid_statuses(self):
        return ['Entregado', 'Recibido']
    
    def can_log_hours(self):
        return True
    
    def get_status_color(self):
        return 'blue'
    
    def get_status_icon(self):
        return 'settings'
    
    def can_edit_ticket(self):
        return True
    
    def requires_user_assignment(self):
        return True


class EntregadoStatusStrategy(TicketStatusStrategy):
    
    def get_next_valid_statuses(self):
        return ['En Proceso']
    
    def can_log_hours(self):
        return False
    
    def get_status_color(self):
        return 'green'
    
    def get_status_icon(self):
        return 'check'
    
    def can_edit_ticket(self):
        return False
    
    def requires_user_assignment(self):
        return True


class PausadoStatusStrategy(TicketStatusStrategy):
    
    def get_next_valid_statuses(self):
        return ['En Proceso', 'Recibido']
    
    def can_log_hours(self):
        return False
    
    def get_status_color(self):
        return 'yellow'
    
    def get_status_icon(self):
        return 'pause'
    
    def can_edit_ticket(self):
        return True
    
    def requires_user_assignment(self):
        return True


class CanceladoStatusStrategy(TicketStatusStrategy):
    
    def get_next_valid_statuses(self):
        return ['Recibido']
    
    def can_log_hours(self):
        return False
    
    def get_status_color(self):
        return 'red'
    
    def get_status_icon(self):
        return 'x'
    
    def can_edit_ticket(self):
        return False
    
    def requires_user_assignment(self):
        return False


class TicketStatusManager:
    _strategies = {
        'Recibido': RecibidoStatusStrategy(),
        'En Proceso': EnProcesoStatusStrategy(),
        'Entregado': EntregadoStatusStrategy(),
        # Nuevos estados se pueden agregar aquí sin modificar código existente
    }
    
    @classmethod
    def get_strategy(cls, status):
        return cls._strategies.get(status, RecibidoStatusStrategy())
    
    @classmethod
    def get_all_statuses(cls):
        return list(cls._strategies.keys())
    
    @classmethod
    def get_status_choices(cls):
        return [(status, status) for status in cls.get_all_statuses()]
    
    @classmethod
    def register_strategy(cls, status_name, strategy):
        if not isinstance(strategy, TicketStatusStrategy):
            raise ValueError("La estrategia debe heredar de TicketStatusStrategy")
        
        cls._strategies[status_name] = strategy
    
    @classmethod
    def unregister_strategy(cls, status_name):
        """
        Desregistra una estrategia de estado.
        
        Args:
            status_name (str): Nombre del estado a eliminar
        """
        if status_name in cls._strategies:
            del cls._strategies[status_name]
    
    @classmethod
    def get_status_info(cls, status):
        """
        Obtiene información completa del estado.
        
        Args:
            status (str): Nombre del estado
            
        Returns:
            dict: Información completa del estado
        """
        strategy = cls.get_strategy(status)
        return {
            'name': status,
            'color': strategy.get_status_color(),
            'icon': strategy.get_status_icon(),
            'can_log_hours': strategy.can_log_hours(),
            'can_edit_ticket': strategy.can_edit_ticket(),
            'requires_user_assignment': strategy.requires_user_assignment(),
            'next_valid_statuses': strategy.get_next_valid_statuses()
        }