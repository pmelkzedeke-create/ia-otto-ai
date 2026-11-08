"""
Módulo para cálculo de fatorial.

Fornece uma implementação iterativa robusta com validação de tipos e valores.
"""

def factorial(n: int) -> int:
    """
    Calcula o fatorial de um número inteiro não-negativo.

    Args:
        n (int): O número inteiro cujo fatorial será calculado. Deve ser >= 0.

    Returns:
        int: O resultado do fatorial de n.

    Raises:
        TypeError: Se 'n' não for um inteiro.
        ValueError: Se 'n' for negativo.
    """
    if not isinstance(n, int):
        raise TypeError(f"O argumento deve ser um inteiro, recebido {type(n).__name__}")
    
    if n < 0:
        raise ValueError("O fatorial não está definido para números negativos")
    
    result = 1
    for i in range(2, n + 1):
        result *= i
    
    return result

if __name__ == "__main__":
    # Demonstração básica e testes rápidos
    try:
        print(f"5! = {factorial(5)}")   # Esperado: 120
        print(f"0! = {factorial(0)}")   # Esperado: 1
        print(f"10! = {factorial(10)}") # Esperado: 3628800
        
        # Testes de erro esperados
        try:
            factorial(-1)
        except ValueError as e:
            print(f"Erro capturado corretamente (-1): {e}")
            
        try:
            factorial(3.5)
        except TypeError as e:
            print(f"Erro capturado corretamente (float): {e}")
            
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")